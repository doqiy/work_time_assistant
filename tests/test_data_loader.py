"""Run with: python -m unittest discover -s tests -v"""

import sys
import unittest
from datetime import datetime
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import data_loader as loader


class RecordSemanticsTests(unittest.TestCase):
    def test_ids_do_not_lose_precision_and_values_remain_raw(self):
        record = loader.project_record({
            "user_id": 9007199254740993,
            "author_id": "0010001",
            "behavior_type": "进场行为",
            "is_topic": "付费引导",
            "action_score": 0,
            "topic_text": None,
            "from_scene": "outside_dictionary",
        }, {"user_id", "author_id", "behavior_type", "is_topic", "action_score", "topic_text"})
        self.assertEqual(record["user_id"], "9007199254740993")
        self.assertEqual(record["author_id"], "0010001")
        self.assertEqual(record["is_topic"], "付费引导")
        self.assertEqual(record["behavior_type"], "进场行为")
        self.assertEqual(record["action_score"], 0)
        self.assertIsNone(record["topic_text"])
        self.assertNotIn("from_scene", record)

    def test_absent_user_id_is_not_invented(self):
        record = loader.project_record({"behavior_id": "arbitrary_12345", "author_id": 1}, {"behavior_id", "author_id", "user_id"})
        self.assertNotIn("user_id", record)

    def test_boolean_status_has_three_states(self):
        self.assertEqual(loader.status_key(True), "success")
        self.assertEqual(loader.status_key(False), "failure")
        self.assertEqual(loader.status_key("false"), "failure")
        for raw in (None, "", "unknown", 1, 0):
            self.assertEqual(loader.status_key(raw), "unknown")

    def test_ms_unit_requires_every_row_to_match_beijing_time(self):
        raw = {"send_timestamp": 1792474206123, "send_time": datetime(2026, 10, 20, 13, 30, 6, 123000)}
        self.assertEqual(loader.verify_millisecond_timestamps([raw])["unit"], "ms")
        mismatch = {**raw, "send_time": datetime(2026, 10, 20, 13, 30, 7, 123000)}
        validation = loader.verify_millisecond_timestamps([raw, mismatch])
        self.assertIsNone(validation["unit"])
        self.assertEqual(validation["mismatched"], 1)
        missing = {"send_timestamp": 1792474206123}
        self.assertIsNone(loader.verify_millisecond_timestamps([raw, missing])["unit"])

    def test_group_counts_keep_false_unknown_and_repeated_behavior(self):
        rows = [{"author_id": "1", "live_stream_id": "2", "behavior_id": "repeat", "send_timestamp": 1000, "send_status": value} for value in (True, False, None)]
        group = loader.build_groups(rows)[0]
        self.assertEqual(group["count"], 3)
        self.assertEqual([group[key] for key in ("success_count", "failure_count", "unknown_count")], [1, 1, 1])
        self.assertEqual((group["earliest"], group["latest"]), (1000, 1000))


class SuppliedSourcesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fields = loader.load_fields()
        cls.demo = loader.load_source("demo")
        cls.real = loader.load_source("real")
        cls.real_high = loader.load_source("real_high")

    def test_dictionary_only_records(self):
        allowed = {field["name"] for field in self.fields}
        self.assertEqual(len(allowed), 49)
        for source in (self.demo, self.real, self.real_high):
            self.assertTrue(all(set(row) <= allowed for row in source["records"]))
        self.assertNotIn("send_time", self.real["records"][0])
        self.assertNotIn("from_scene", self.real["records"][0])

    def test_demo_covers_multiple_statuses_and_keeps_same_time_order(self):
        records = loader.source_records("900001", "990001", "demo")["records"]
        self.assertEqual(len(records), 18)
        self.assertEqual(records[1]["send_timestamp"], records[2]["send_timestamp"])
        self.assertEqual([row["behavior_id"] for row in records[1:3]], ["demo_behavior_002", "demo_behavior_003"])
        self.assertEqual({loader.status_key(row["send_status"]) for row in records}, {"success", "failure", "unknown"})
        self.assertTrue(self.demo["meta"]["is_demo"])
        self.assertEqual(records[0]["user_id"], "9007199254740993")

    def test_real_source_schema_and_complete_timestamp_check(self):
        meta = self.real["meta"]
        self.assertEqual(meta["record_count"], 25680)
        self.assertNotIn("user_id", meta["missing_fields"])
        self.assertEqual(meta["user_id_record_count"], 25680)
        self.assertEqual(meta["unique_user_count"], 16734)
        self.assertTrue(all(isinstance(row.get("user_id"), str) and row["user_id"] for row in self.real["records"]))
        self.assertEqual(meta["extra_fields"], ["from_scene", "send_time"])
        self.assertEqual(meta["timestamp_unit"], "ms")
        self.assertEqual(meta["timestamp_validation"], {"unit": "ms", "matched": 25680, "missing": 0, "mismatched": 0, "total": 25680})
        self.assertTrue(all(row["send_status"] is True for row in self.real["records"]))
        self.assertEqual(len(self.real["groups"]), 1078)

    def test_high_frequency_schema_and_complete_timestamp_check(self):
        meta = self.real_high["meta"]
        self.assertEqual(meta["source"], "real_high")
        self.assertEqual(meta["title"], "直播助手高频主播建议记录_20261020.xlsx")
        self.assertEqual(meta["display_label"], "真实数据·高频主播")
        self.assertFalse(meta["is_demo"])
        self.assertEqual(meta["record_count"], 62359)
        self.assertEqual(meta["user_id_record_count"], 62359)
        self.assertEqual(meta["unique_user_count"], 38504)
        self.assertTrue(all(isinstance(row.get("user_id"), str) and row["user_id"] for row in self.real_high["records"]))
        self.assertEqual(meta["field_count"], 43)
        self.assertEqual(meta["extra_fields"], ["from_scene", "send_time"])
        self.assertEqual(meta["missing_fields"], ["author_gender", "kpn", "p_date", "p_hourmin", "text_segment", "user_gender"])
        self.assertEqual(meta["timestamp_validation"], {"unit": "ms", "matched": 62359, "missing": 0, "mismatched": 0, "total": 62359})
        self.assertTrue(all(row["send_status"] is True for row in self.real_high["records"]))
        self.assertEqual(len(self.real_high["groups"]), 1055)
        self.assertEqual(len({row["author_id"] for row in self.real_high["records"]}), 1000)

    def test_source_caches_and_room_queries_stay_separate(self):
        self.assertIs(loader.load_source("real"), self.real)
        self.assertIs(loader.load_source("real_high"), self.real_high)
        self.assertIsNot(self.real, self.real_high)
        self.assertEqual(self.real["meta"]["display_label"], "真实数据·频率时长适中")
        self.assertEqual(loader.source_summary("real")["meta"]["record_count"], 25680)
        self.assertEqual(loader.source_summary("real_high")["meta"]["record_count"], 62359)
        group = self.real_high["groups"][0]
        result = loader.source_records(group["author_id"], group["live_stream_id"], "real_high")
        self.assertEqual(result["meta"]["source"], "real_high")
        self.assertEqual(len(result["records"]), group["count"])
        self.assertTrue(all(row["author_id"] == group["author_id"] and row["live_stream_id"] == group["live_stream_id"] for row in result["records"]))
        old_rows = loader.source_records(group["author_id"], group["live_stream_id"], "real")["records"]
        expected_old_rows = [row for row in self.real["records"] if row["author_id"] == group["author_id"] and row["live_stream_id"] == group["live_stream_id"]]
        self.assertEqual(old_rows, expected_old_rows)

    def test_missing_real_file_is_error_not_demo_fallback(self):
        with patch.object(loader, "REAL_DATA_PATH", Path("/nonexistent/assistant_missing_source.xlsx")):
            with self.assertRaises(loader.SourceError):
                loader.load_source("real")

    def test_missing_high_frequency_file_is_error_not_other_source_fallback(self):
        with patch.object(loader, "HIGH_FREQ_DATA_PATH", Path("/nonexistent/assistant_missing_high_source.xlsx")):
            with self.assertRaises(loader.SourceError):
                loader.load_source("real_high")
            self.assertIs(loader.load_source("real"), self.real)
            self.assertIs(loader.load_source("demo"), self.demo)

    def test_returned_group_matches_author_and_room_exactly(self):
        group = self.real["groups"][0]
        records = loader.source_records(group["author_id"], group["live_stream_id"], "real")["records"]
        self.assertEqual(len(records), group["count"])
        self.assertTrue(all(row["author_id"] == group["author_id"] and row["live_stream_id"] == group["live_stream_id"] for row in records))
        self.assertEqual(loader.source_records("not_an_author", "not_a_room", "real")["records"], [])


if __name__ == "__main__":
    unittest.main()
