'use strict';

// Only data fields defined in 字段注释表 are used as record inputs.
// Labels, filters, formatted times and row positions are presentation state.
const BEHAVIORS = {1:'送礼',2:'看播',3:'评论',4:'关注',5:'分享',6:'点赞',7:'进场',8:'开粉丝团',9:'开通超粉团',10:'开通贵族',11:'粉丝团升级',12:'守护升级',13:'看播180秒',14:'看播300秒',15:'看播600秒',16:'较长看播档位4',17:'较长看播档位5',18:'多次点赞10次',19:'多次点赞100次',20:'多次点赞档位3',21:'多次点赞档位4',22:'多次点赞档位5',23:'多次评论5次',24:'多次评论10次',25:'多次评论档位3',26:'多次评论档位4',27:'多次评论档位5',28:'进场停留5秒',29:'超短看播档位2',30:'超短看播档位3',31:'火苗解锁',32:'火苗升级'};
const BEHAVIOR_ALIASES = {'送礼行为':1,'看播行为':2,'评论行为':3,'关注行为':4,'分享行为':5,'点赞行为':6,'进场行为':7,'开粉丝团':8,'开通超粉团':9,'开通贵族':10,'粉丝团升级':11,'守护升级':12,'火苗解锁':31,'火苗升级':32};
const TOPICS = {'-1':'未知',1:'偏好话题',2:'付费话题',3:'U话题',4:'A兴趣话题',5:'A评论话题',6:'UA话题',7:'实时热门话题',8:'通用话题',9:'才艺表演',10:'双人PK',11:'多人PK'};
// 付费引导 is an observed export alias in this supplied workbook; raw data remains unchanged.
const TOPIC_ALIASES = Object.fromEntries(Object.entries(TOPICS).map(([code,label])=>[label,Number(code)]));
TOPIC_ALIASES['付费引导']=2;
const STRATEGIES={ANNIVERSARY:'纪念日',FAN_CLUB_LIGHT_BOARD_OFF:'粉丝团灯牌熄灭',GIFT_ACHIEVEMENT_NOT_FINISH:'成就馆未完成',NOT_IN_FANS_CLUB:'未加入粉丝团',PK:'PK',ROOM_VIP:'守护',WISH_LIST_NOT_FINISH:'心愿单未完成',UA_PAY:'UA还差xx满n快币',AUTHOR_PAY_DIFF:'主播还差xx满n快币',AUTHOR_PAY_NEW:'主播新高',HIGH_VALUE_PAY_NEW_USER_FIRST_SEND_GIFT:'高价值新客首次送礼',HISTORY_LIKE_GIFT:'历史偏好礼物',USER_PAY_POTENTIAL:'用户付费潜力',USER_PAY_PROB:'用户高付费概率',LIVE_STREAM_CATEGORY:'内容偏好送礼',NEW_GIFT:'新礼物引导',GIFT_STICKERS:'礼物贴纸',COMMON_GIFT:'通用礼物',AUTHOR_PAY_ZERO:'主播开张/破零',flame_ignite:'解锁火苗',flame_level_up:'火苗升级',FLAME_TRAFFIC_GIFT_GUIDE:'火苗礼物未送'};
const REASONS_FALSE={1:'分数没到阈值',2:'命中单行为限制上限',3:'命中欢迎上限或感谢上限'};
const REASONS_TRUE={1:'分数达到阈值且简单频控、复杂频控均在额度内',2:'达到复杂频控但突破阈值'};
const FIELD_LABELS={p_date:'分区日期',p_hourmin:'分区小时',kpn:'直播产品',live_stream_id:'直播间ID',send_timestamp:'原始时间戳',user_id:'用户ID',author_id:'主播ID',receiver_author_id:'接收端作者ID',behavior_type:'关联行为',behavior_id:'平台行为ID',suggestion_text:'建议文案',topic_text:'话题文案',ua_relation_text:'UA关系文案',is_topic:'提示类别',topic_type:'话题类型',output_type:'输出形式',is_ai:'偏好话题AI来源标记',send_status:'发送状态',send_true_reason:'发送成功原因',send_false_reason:'发送失败原因',from_strategy:'付费场景 1',from_sub_strategy:'付费场景 2',is_combination:'组合付费场景',text_a:'第一场景话术',text_b:'第二场景话术',text_final:'组合最终文案',text_a_from:'第一场景来源',text_b_from:'第二场景来源',final_text_from:'最终结果来源',is_success:'组合模型生成结果',fail_reason:'模型返回失败原因',topic_fall_reason:'偏好话题生产失败原因',action_score:'行为分',user_score:'用户分',user_platform_score:'付费能力',user_baseline_score:'付费率基线',preference_score:'偏好加权',user_status_score:'状态加权',action_type_score:'行为加权',meet_sending_condition:'满足发送条件',realtime_context:'实时上下文原值',text_segment:'PK结构原值',ua_comment_type:'UA评论类型',is_professional_author:'是否专业主播',author_gender:'主播性别',user_gender:'用户性别',enable_audience_exp:'观众端实验原值',beyond_score_threshold:'原字段（释义未明确）',interact_assistant_scene:'助手场景原值'};
const FIELD_GROUPS=[
  ['五个独立维度',['behavior_type','topic_type','is_topic','output_type','from_strategy','is_combination','from_sub_strategy']],
  ['完整文案（原文）',['suggestion_text','topic_text']],
  ['对象与时间',['author_id','live_stream_id','user_id','receiver_author_id','behavior_id','send_timestamp','kpn','p_date','p_hourmin']],
  ['发送结果',['send_status','send_true_reason','send_false_reason','meet_sending_condition']],
  ['场景话术与文案来源',['text_a','text_b','text_final','text_a_from','text_b_from','final_text_from','is_success','fail_reason','topic_fall_reason']],
  ['分数与上下文',['action_score','user_score','user_platform_score','user_baseline_score','preference_score','user_status_score','action_type_score','ua_relation_text','ua_comment_type','realtime_context','text_segment','is_professional_author','author_gender','user_gender']]
];
const $=id=>document.getElementById(id);
const state={source:'real',meta:{},groups:[],selected:null,records:[],audienceLabels:new Map(),focusedUser:null,onlyFocused:false,fields:new Map(),status:'all',topic:'all',behavior:'all',output:'all',strategy:'all',search:'',roomSearch:'',spacing:true,limit:50,roomLimit:50,loadToken:0,controller:null};
function node(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;}
function missing(v){return v===null||v===undefined||v==='';}
function enumValue(raw,labels,aliases={}){if(missing(raw))return{key:'missing',code:null,label:'未提供'};const s=String(raw).trim();let code=/^-?\d+(?:\.0+)?$/.test(s)?Number(s):aliases[s];if(code!==undefined&&Object.hasOwn(labels,code))return{key:String(code),code,label:labels[code]};return{key:'raw:'+s,code:null,label:'未注明（'+s+'）'};}
const behavior=r=>enumValue(r.behavior_type,BEHAVIORS,BEHAVIOR_ALIASES);
const topic=r=>enumValue(r.is_topic,TOPICS,TOPIC_ALIASES);
const TOPIC_KINDS={1:'偏好话题',2:'付费话题'};
const OUTPUT_FORMS={0:'话术',1:'建议'};
const outputForm=r=>enumValue(r.output_type,OUTPUT_FORMS);
function strategyValue(r){
  if(missing(r.from_strategy))return{key:'missing',label:'未提供'};
  const raw=String(r.from_strategy),known=Object.hasOwn(STRATEGIES,raw);
  return{key:known?raw:'raw:'+raw,label:known?STRATEGIES[raw]:'字典未注明（'+raw+'）'};
}
// Full enum catalog from 字段注释表.xlsx. Never derive the available choices
// from the current room, its filters, or the enums observed in an export.
const BEHAVIOR_FILTER_LABELS={...BEHAVIORS,
  1:'送礼行为',2:'看播行为',3:'评论行为',4:'关注行为',5:'分享行为',6:'点赞行为',7:'进场行为',
  16:'长时间看播档位4（时长未注明）',17:'长时间看播档位5（时长未注明）',
  20:'多次点赞档位3（次数未注明）',21:'多次点赞档位4（次数未注明）',22:'多次点赞档位5（次数未注明）',
  25:'多次评论档位3（次数未注明）',26:'多次评论档位4（次数未注明）',27:'多次评论档位5（次数未注明）',
  29:'超短看播档位2（时长未注明）',30:'超短看播档位3（时长未注明）'
};
const STRATEGY_FILTER_LABELS={...STRATEGIES,UA_PAY:'ua还差xx满n快币',AUTHOR_PAY_DIFF:'A还差xx满n快币',AUTHOR_PAY_NEW:'A新高'};
const FILTER_CATALOGS={
  'behavior-filter':BEHAVIOR_FILTER_LABELS,
  'topic-filter':TOPICS,
  'output-filter':OUTPUT_FORMS,
  'strategy-filter':STRATEGY_FILTER_LABELS
};
const FILTERS=[['behavior','behavior-filter',behavior,'全部行为'],['topic','topic-filter',topic,'全部提示类别'],['output','output-filter',outputForm,'全部输出形式'],['strategy','strategy-filter',strategyValue,'全部场景']];
function statusOf(r){if(r.send_status===true||r.send_status==='true')return'success';if(r.send_status===false||r.send_status==='false')return'failure';return'unknown';}
function palette(code){return Number.isInteger(code)&&code>=1&&code<=11?'topic-'+code:'topic-neutral';}
function renderTopicLegend(){
  const legend=$('topic-legend');legend.replaceChildren(node('span','','提示类别 is_topic：'));
  for(const [code,label] of Object.entries(TOPICS)){
    if(Number(code)<1)continue;
    const item=node('span',palette(Number(code)));item.title='is_topic = '+code;
    const dot=node('i','legend-dot');dot.setAttribute('aria-hidden','true');
    item.append(dot,node('span','',label));legend.append(item);
  }
  legend.append(node('small','','-1 未知 / 未提供 / 未定义值不着色'));
}
function timestamp(r){if(missing(r.send_timestamp)||!['ms','s'].includes(state.meta.timestamp_unit))return null;const n=Number(r.send_timestamp)*(state.meta.timestamp_unit==='s'?1000:1);return Number.isFinite(n)&&!Number.isNaN(new Date(n).getTime())?n:null;}
const timeFormatter=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
function timeParts(ms){if(ms===null)return{date:'时间未确认',time:'—',millis:''};const p=Object.fromEntries(timeFormatter.formatToParts(new Date(ms)).map(x=>[x.type,x.value]));return{date:p.year+'-'+p.month+'-'+p.day,time:p.hour+':'+p.minute+':'+p.second,millis:'.'+String(Math.floor(((ms%1000)+1000)%1000)).padStart(3,'0')};}
function duration(ms){if(ms===0)return'同一时间';if(ms<1000)return Math.round(ms)+' 毫秒';const sec=ms/1000;if(sec<60)return Number(sec.toFixed(3))+' 秒';let m=Math.floor(sec/60),s=Number((sec%60).toFixed(3));if(m<60)return m+' 分'+(s?' '+s+' 秒':'');const h=Math.floor(m/60);m%=60;return h+' 小时'+(m?' '+m+' 分':'')+(s?' '+s+' 秒':'');}
function rawString(v){return missing(v)?'未提供':typeof v==='object'?JSON.stringify(v,null,2):String(v);}
function mappedRaw(v,map){if(missing(v))return'未提供';const label=map[v];return label?label+'（原值 '+v+'）':'字典未注明（原值 '+v+'）';}
function fieldValue(key,r){const v=r[key];if(key==='behavior_type')return behavior(r).label+' · 原值 '+rawString(v);if(key==='is_topic')return topic(r).label+' · 原值 '+rawString(v);if(key==='output_type')return mappedRaw(v,OUTPUT_FORMS);if(key==='topic_type')return mappedRaw(v,TOPIC_KINDS);if(key==='send_status')return statusOf(r)==='success'?'发送成功（true）':statusOf(r)==='failure'?'发送失败（false）':'状态未知';if(key==='send_true_reason')return mappedRaw(v,REASONS_TRUE);if(key==='send_false_reason')return mappedRaw(v,REASONS_FALSE);if(['from_strategy','from_sub_strategy'].includes(key))return missing(v)?'未提供':(STRATEGIES[v]?STRATEGIES[v]+'（'+v+'）':'未注明（'+v+'）');if(key==='is_combination')return mappedRaw(v,{0:'否',1:'是'});if(['text_a_from','text_b_from'].includes(key))return mappedRaw(v,{0:'兜底',1:'离线库'});if(key==='final_text_from')return mappedRaw(v,{0:'兜底',1:'离线库',2:'模型生产'});if(key==='is_success')return mappedRaw(v,{0:'失败',1:'成功'})+'；仅指组合模型生成';if(key==='fail_reason')return mappedRaw(v,{0:'延迟',1:'风控'});if(key==='topic_fall_reason')return mappedRaw(v,{1:'调用服务失败',2:'调用成功但无可用topic（可能因为频控/风控）',3:'模型生成失败'});return rawString(v);}
async function fetchJSON(url,signal){const response=await fetch(url,{signal});let data;try{data=await response.json();}catch{throw new Error('服务未返回有效数据');}if(!response.ok)throw new Error(typeof data.detail==='string'?data.detail:'读取失败（'+response.status+'）');return data;}
function empty(container,title,description,retry){container.replaceChildren();const box=node('div','empty-state');box.append(node('strong','',title),node('p','',description));if(retry){const button=node('button','', '重试');button.addEventListener('click',retry);box.append(button);}container.append(box);}
function renderMeta(){
  const m=state.meta,isReal=state.source!=='demo',label=m.display_label||(state.source==='real_high'?'真实数据 · 高频主播':'真实数据 · 频率时长适中');
  const notice=$('dataset-note');notice.removeAttribute('title');notice.className='dataset-note'+(isReal?' real':'');
  if(!isReal){
    notice.textContent='模拟数据 · 用于演示页面效果，用户、事件及文案均为虚构。可切换到你提供的真实数据。';
  }else{
    const coverage=Number(m.user_id_record_count||0);
    notice.textContent=[label+' · '+Number(m.record_count||0).toLocaleString()+' 条记录','用户ID已提供 '+coverage.toLocaleString()+' 条','发送成功不代表主播已看到'].join('　·　');
  }
  notice.title=[m.title,...(Array.isArray(m.notes)?m.notes:[])].join('\n');
  $('source-select').title=m.title||'';
  $('source-badge').textContent=isReal?label:'模拟数据';
  $('source-badge').className='source-badge'+(isReal?' real':'');
}
function renderRooms(){const list=$('room-list');list.replaceChildren();const q=state.roomSearch.trim().toLowerCase();const groups=state.groups.filter(g=>!q||[g.author_id,g.live_stream_id].some(v=>String(v).toLowerCase().includes(q)));$('group-count').textContent=groups.length.toLocaleString();if(!groups.length){empty(list,'没有匹配的直播间','试试其他主播或直播间ID');}for(const g of groups.slice(0,state.roomLimit)){const selected=state.selected&&g.author_id===state.selected.author_id&&g.live_stream_id===state.selected.live_stream_id;const b=node('button','room-item'+(selected?' active':''));b.setAttribute('aria-pressed',String(!!selected));b.append(node('span','room-author','主播 '+rawString(g.author_id)),node('span','room-id','直播间 '+rawString(g.live_stream_id)),node('span','room-count',Number(g.count).toLocaleString()+' 条提示记录'));b.addEventListener('click',()=>selectRoom(g));list.append(b);}$('more-rooms').hidden=groups.length<=state.roomLimit;}
function fillOptions(id,records,getValue,label){
  const select=$(id),catalog=FILTER_CATALOGS[id],counts=new Map(),observed=new Map();
  for(const r of records){const v=getValue(r);counts.set(v.key,(counts.get(v.key)||0)+1);observed.set(v.key,v.label);}
  select.replaceChildren(new Option(label,'all'));
  const defined=node('optgroup');defined.label='字段注释表 · 完整枚举';
  const entries=Object.entries(catalog);
  if(id!=='strategy-filter')entries.sort((a,b)=>Number(a[0])-Number(b[0]));
  for(const [key,value]of entries){
    // Keep zero-count choices selectable: no records is different from no enum.
    const caption=id==='strategy-filter'?value+' · '+key:key+' · '+value;
    const option=new Option(caption+'（'+(counts.get(key)||0)+'条）',key);
    option.title=key+' = '+value+'；数量为当前直播间全部记录，不随其他筛选联动';
    defined.append(option);
  }
  select.append(defined);
  const extra=node('optgroup');extra.label='数据缺失 / 字典未定义';
  extra.append(new Option('未提供（空值，'+(counts.get('missing')||0)+'条）','missing'));
  for(const [key,value]of observed){
    if(key==='missing'||Object.hasOwn(catalog,key))continue;
    extra.append(new Option(value+'（'+counts.get(key)+'条）',key));
  }
  select.append(extra);
  select.title='完整枚举；括号数量为当前直播间全部记录，0条也可筛选。';
}
function refreshFilterOptions(){for(const [,id,getValue,label]of FILTERS)fillOptions(id,state.records,getValue,label);}
function resetFilters(){
  state.status='all';state.search='';state.limit=50;state.focusedUser=null;state.onlyFocused=false;
  for(const [key,id] of FILTERS){state[key]='all';$(id).value='all';}
  $('record-search').value='';
  document.querySelectorAll('[data-status]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.status==='all')));
  renderTimeline();
}
async function loadDataset(){state.source=$('source-select').value;state.controller?.abort();const controller=new AbortController();state.controller=controller;const token=++state.loadToken;state.selected=null;state.records=[];state.audienceLabels=new Map();state.focusedUser=null;state.onlyFocused=false;$("audience-focus").hidden=true;refreshFilterOptions();state.groups=[];state.roomSearch='';state.roomLimit=50;$('room-search').value='';renderRooms();$('room-title').textContent='正在读取数据…';$('room-subtitle').textContent='';$('room-warning').hidden=true;['total','success','failure','unknown'].forEach(k=>$('stat-'+k).textContent='—');empty($('timeline'),'正在载入','请稍候');$('load-more').hidden=true;$('timeline').setAttribute('aria-busy','true');$('dataset-note').removeAttribute('title');$('dataset-note').textContent='正在读取'+(state.source==='demo'?'模拟':'真实')+'数据…';try{const data=await fetchJSON('/api/summary?source='+state.source,controller.signal);if(token!==state.loadToken)return;state.meta=data.meta;state.groups=data.groups;renderMeta();renderRooms();if(state.groups.length)await selectRoom(state.groups[0]);else empty($('timeline'),'没有记录','数据文件没有可展示的提示。');}catch(error){if(error.name==='AbortError')return;state.meta={};$('dataset-note').className='dataset-note error';$('dataset-note').textContent='读取失败：'+error.message;empty($('timeline'),'数据未能加载',error.message,loadDataset);$('room-title').textContent='数据加载失败';}finally{if(token===state.loadToken)$('timeline').setAttribute('aria-busy','false');}}
async function selectRoom(group){state.controller?.abort();const controller=new AbortController();state.controller=controller;const token=++state.loadToken;state.selected=group;state.records=[];state.audienceLabels=new Map();state.focusedUser=null;state.onlyFocused=false;$("audience-focus").hidden=true;refreshFilterOptions();renderRooms();$('room-title').textContent='主播 '+rawString(group.author_id);$('room-subtitle').textContent='直播间 '+rawString(group.live_stream_id);['total','success','failure','unknown'].forEach(k=>$('stat-'+k).textContent='—');$('room-warning').hidden=true;$('visible-count').textContent='加载中';$('range-label').textContent='';$('load-more').hidden=true;$('timeline').setAttribute('aria-busy','true');empty($('timeline'),'正在载入提示','');try{const query=new URLSearchParams({source:state.source,live_stream_id:group.live_stream_id});const data=await fetchJSON('/api/records/'+encodeURIComponent(group.author_id)+'?'+query,controller.signal);if(token!==state.loadToken)return;state.meta=data.meta;state.records=data.records.map((r,i)=>({r,i})).sort((a,b)=>(timestamp(a.r)??Infinity)-(timestamp(b.r)??Infinity)||a.i-b.i).map(x=>x.r);state.audienceLabels=AudienceLabels.create(state.records);renderMeta();const counts={success:0,failure:0,unknown:0};state.records.forEach(r=>counts[statusOf(r)]++);$('stat-total').textContent=state.records.length.toLocaleString();for(const k in counts)$('stat-'+k).textContent=counts[k].toLocaleString();refreshFilterOptions();const warnings=[];const missingUsers=state.records.filter(r=>missing(r.user_id)).length;if(missingUsers)warnings.push(missingUsers+' 条记录缺少用户ID');if(!state.meta.timestamp_unit)warnings.push('时间戳单位未确认，保留原值且不计算间隔');if(state.source!=='demo'&&counts.failure===0&&counts.unknown===0)warnings.push('此直播间所提供的记录均为发送成功');$('room-warning').hidden=!warnings.length;$('room-warning').textContent=warnings.join('；')+'。';resetFilters();}catch(error){if(error.name==='AbortError')return;empty($('timeline'),'无法读取这个直播间',error.message,()=>selectRoom(group));}finally{if(token===state.loadToken)$('timeline').setAttribute('aria-busy','false');}}
function fillDetails(content,r){
  const always=['user_id','send_timestamp','behavior_type','is_topic','topic_type','output_type','from_strategy','send_status','receiver_author_id','suggestion_text','topic_text'];
  if(Number(r.is_combination)===1)always.push('from_sub_strategy');
  const note=node('p','detail-note','话题类型与提示类别为独立字段；输出形式按原值展示。付费场景只说明场景，不代表完整触发条件。');
  content.append(note);
  if(statusOf(r)!=='success')content.append(node('p','unsent-note',statusOf(r)==='failure'?'本条发送失败，以下文案不表示已展示。':'发送状态未提供，不推定已发送或已展示。'));
  for(const [title,keys]of FIELD_GROUPS){
    const available=keys.filter(k=>!missing(r[k])||always.includes(k));
    if(!available.length)continue;
    const section=node('section','detail-section');section.append(node('h3','',title));
    const dl=node('dl','detail-grid');
    for(const key of available){
      const dt=node('dt');dt.append(node('span','',FIELD_LABELS[key]||key),node('code','',key));
      const definition=state.fields.get(key);
      if(definition)dt.title=definition.description+(definition.remark?'\n'+definition.remark:'');
      dl.append(dt,node('dd','',fieldValue(key,r)));
    }
    section.append(dl);content.append(section);
  }
  const raw=node('details','raw-details');raw.append(node('summary','','查看原始字段'),node('pre','',JSON.stringify(r,null,2)));content.append(raw);
}
function recordCell(cls,label,field,r,text){
  const cell=node('div','cell '+cls,text);cell.dataset.label=label;
  cell.title=field+' · '+label+'\n原值：'+rawString(r[field]);return cell;
}
function applyAudienceFocus(){
  const selected=state.focusedUser;
  const rows=[...$('timeline').querySelectorAll('.timeline-row')];
  let visible=0;
  for(const row of rows){
    const match=selected!==null&&row.dataset.recordUser===selected;
    row.classList.toggle('audience-highlight',match);
    row.classList.toggle('audience-muted',selected!==null&&!match);
    if(match)visible++;
    const button=row.querySelector('.audience-button');
    if(button){button.setAttribute('aria-pressed',String(match));button.title=(match?'再次点击取消高亮':'点击高亮该观众的所有记录');}
  }
  $('audience-focus').hidden=selected===null;
  $('audience-only-toggle').checked=state.onlyFocused&&selected!==null;
  $('audience-only-toggle').disabled=selected===null;
  $('gap-scope').textContent=state.onlyFocused&&selected!==null
    ? '仅看 '+AudienceLabels.name(state.audienceLabels,selected)+' · 间隔为该观众在当前筛选内相邻两条记录的时间差；上方筛选仍生效。'
    : '间隔按当前筛选后相邻记录计算；高亮不改变记录顺序和间隔。';
  if(selected!==null){
    const count=filteredRecords().filter(r=>AudienceLabels.key(r.user_id)===selected).length;
    const total=state.records.filter(r=>AudienceLabels.key(r.user_id)===selected).length;
    $('audience-focus-label').textContent=(state.onlyFocused?'只看 ':'高亮 ')+AudienceLabels.name(state.audienceLabels,selected)+' · 当前显示 '+visible+' / 筛选内 '+count+' 条 · 本房间共 '+total+' 条';
  }
}
function clearAudienceFocus(){
  const wasOnly=state.onlyFocused;state.focusedUser=null;state.onlyFocused=false;
  if(wasOnly){state.limit=50;renderTimeline();}else applyAudienceFocus();
}
function toggleAudience(userId){
  const id=AudienceLabels.key(userId);
  if(id===null)return;
  if(state.focusedUser===id){clearAudienceFocus();return;}
  state.focusedUser=id;
  if(state.onlyFocused){state.limit=50;renderTimeline();}else applyAudienceFocus();
}
function buildCard(r,index){
  const t=topic(r),b=behavior(r),status=statusOf(r);
  const row=node('article','timeline-row '+palette(t.code));
  row.dataset.recordTimestamp=rawString(r.send_timestamp);
  row.dataset.recordUser=AudienceLabels.key(r.user_id)||'';
  const ms=timestamp(r),parts=timeParts(ms),time=node('div','time-label');
  if(ms===null){time.append(node('span','unknown-time','时间未确认'),node('span','unknown-time',rawString(r.send_timestamp)));}
  else{time.append(node('time','',parts.time),node('span','millis',parts.millis));time.title='记录时间 '+parts.date+' '+parts.time+parts.millis+'\nsend_timestamp: '+r.send_timestamp;}
  const track=node('div','track');track.setAttribute('aria-hidden','true');track.append(node('span','track-dot'));
  const card=node('div','record-card '+status),line=node('div','record-line');
  const audience=recordCell('cell-user'+(missing(r.user_id)?' missing-user':''),'观众','user_id',r);
  if(AudienceLabels.key(r.user_id)!==null){
    const name=node('button','audience-name audience-button',AudienceLabels.name(state.audienceLabels,r.user_id));
    name.type='button';name.setAttribute('aria-pressed','false');
    name.addEventListener('click',()=>toggleAudience(r.user_id));audience.append(name);
  }else audience.append(node('strong','audience-name','观众未标识'));
  audience.append(node('small','audience-id','ID '+rawString(r.user_id)));
  line.append(audience);
  line.append(recordCell('cell-behavior','行为','behavior_type',r,b.label));
  const subtype=recordCell('cell-subtype','提示类别','is_topic',r);
  subtype.append(node('span','type-tag',t.label));line.append(subtype);
  line.append(recordCell('cell-output','输出形式','output_type',r,outputForm(r).label));
  const scene=recordCell('cell-strategy','付费场景1','from_strategy',r,strategyValue(r).label);
  if(Number(r.is_combination)===1){scene.prepend(node('span','combination-marker','组合 '));scene.title+='\nis_combination=1；场景2：'+fieldValue('from_sub_strategy',r)+'（详情查看）';}
  line.append(scene);
  const copy=node('div','cell cell-copy');copy.dataset.label='文案';let hasCopy=false;const fullCopy=[];
  for(const[key,label]of[['suggestion_text','建议文案'],['topic_text','话题文案']]){
    if(missing(r[key]))continue;
    if(hasCopy)copy.append(node('span','copy-divider',' · '));hasCopy=true;
    copy.append(node('span','inline-copy-label',label+'：'),node('span','inline-copy-text',r[key]));fullCopy.push(label+'（'+key+'）：'+r[key]);
  }
  if(!hasCopy)copy.append(node('span','no-copy','文案未提供'));
  copy.title=(fullCopy.join('\n')||'suggestion_text 与 topic_text 均未提供')+'\n展开详情可查看完整原文';line.append(copy);
  const statusCell=node('div','cell cell-status');statusCell.dataset.label='发送';
  const statusBadge=node('span','status '+status,status==='success'?'✓ 成功':status==='failure'?'× 失败':'— 未知');
  statusBadge.title='send_status：'+rawString(r.send_status)+'；发送成功不代表曝光';statusCell.append(statusBadge);line.append(statusCell);
  const actions=node('div','cell cell-action'),button=node('button','expand-button','详情');
  const detail=node('div','detail-content');detail.hidden=true;detail.id='record-detail-'+index;
  button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls',detail.id);button.setAttribute('aria-label','展开第 '+(index+1)+' 条记录详情');
  let built=false;button.addEventListener('click',()=>{
    const open=detail.hidden;detail.hidden=!open;button.textContent=open?'收起':'详情';button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',(open?'收起':'展开')+'第 '+(index+1)+' 条记录详情');
    if(open&&!built){fillDetails(detail,r);built=true;}
  });actions.append(button);line.append(actions);card.append(line,detail);row.append(time,track,card);return row;
}
function gapDisplay(delta){
  if(delta===null)return{tier:'unknown',height:22};
  if(delta===0)return{tier:'same',height:12};
  if(delta<=1000)return{tier:'instant',height:14+4*delta/1000};
  if(delta<=10000)return{tier:'dense',height:18+22*(delta-1000)/9000};
  if(delta<=60000)return{tier:'normal',height:40+32*(delta-10000)/50000};
  if(delta<300000)return{tier:'spaced',height:72+56*(delta-60000)/240000};
  return{tier:'long',height:128+Math.min(64,32*Math.log2(delta/300000))};
}
function buildGap(delta){
  const layout=gapDisplay(delta),gap=node('div','gap-row gap-'+layout.tier);
  gap.dataset.gapMs=delta===null?'':String(delta);
  const axis=node('div','gap-line');axis.setAttribute('aria-hidden','true');
  if(state.spacing&&layout.tier==='long')axis.append(node('span','gap-break','//'));
  gap.append(node('div'),axis);
  const label=node('div','gap-label');
  const prefix=state.onlyFocused?'该观众间隔 ':'间隔 ';
  label.append(node('span','gap-duration',delta===null?'相邻记录时间未确认':delta===0?(state.onlyFocused?'该观众同一时间':'同一时间'):prefix+duration(delta)));
  if(state.spacing&&layout.tier==='long')label.append(node('span','gap-hint','长间隔 · 压缩显示'));
  gap.append(label);gap.style.minHeight=(state.spacing?layout.height:18)+'px';
  gap.title=(state.onlyFocused?'仅该观众在当前筛选内':'当前筛选中')+'相邻记录的时间差；间距分段压缩，并非等比例时间尺。';
  return gap;
}
function filteredRecords(){
  const q=state.search.trim().toLowerCase();
  const aliasQuery=/^观众\s*(\d+)$/.exec(q);
  return state.records.filter(r=>(!state.onlyFocused||state.focusedUser===null||AudienceLabels.key(r.user_id)===state.focusedUser)&&(state.status==='all'||statusOf(r)===state.status)&&FILTERS.every(([key,,getValue])=>state[key]==='all'||getValue(r).key===state[key])&&(!q||(aliasQuery?AudienceLabels.name(state.audienceLabels,r.user_id)==='观众'+Number(aliasQuery[1]):[r.user_id,r.suggestion_text,r.topic_text].some(v=>!missing(v)&&String(v).toLowerCase().includes(q)))));
}
function renderTimeline(){const all=filteredRecords();const container=$('timeline');container.replaceChildren();container.classList.toggle('interval-view',state.spacing);$('interval-guide').hidden=!state.spacing;$('visible-count').textContent=all.length.toLocaleString()+' 条记录';const timed=all.map(timestamp).filter(t=>t!==null);$('range-label').textContent=timed.length?timeParts(timed[0]).time+' — '+timeParts(timed[timed.length-1]).time:'';$('load-more').hidden=all.length<=state.limit;$('load-more').textContent='继续显示 '+Math.min(50,all.length-state.limit)+' 条（共 '+all.length+' 条）';if(!all.length){empty(container,'没有符合条件的记录','调整发送状态、字段筛选或搜索条件。',resetFilters);const button=container.querySelector('button');if(button)button.textContent='清除筛选';applyAudienceFocus();return;}const shown=all.slice(0,state.limit);let lastDate=null;for(let i=0;i<shown.length;i++){const r=shown[i],ts=timestamp(r),date=timeParts(ts).date;if(i>0){const previous=timestamp(shown[i-1]);container.append(buildGap(ts===null||previous===null?null:Math.max(0,ts-previous)));}if(date!==lastDate){container.append(node('div','date-marker',date));lastDate=date;}container.append(buildCard(r,i));}applyAudienceFocus();}
$('source-select').addEventListener('change',()=>{
  const params=new URLSearchParams(location.search);params.set('source',$('source-select').value);
  for(const key of ['author_id','live_stream_id','user_id','timestamp'])params.delete(key);
  history.replaceState(null,'',location.pathname+'?'+params.toString()+location.hash);
  loadDataset();
});
$('room-search').addEventListener('input',event=>{state.roomSearch=event.target.value;state.roomLimit=50;renderRooms();});
$('more-rooms').addEventListener('click',()=>{state.roomLimit+=50;renderRooms();});
document.querySelectorAll('[data-status]').forEach(button=>button.addEventListener('click',()=>{state.status=button.dataset.status;state.limit=50;document.querySelectorAll('[data-status]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));renderTimeline();}));
for(const [key,id] of FILTERS)$(id).addEventListener('change',event=>{state[key]=event.target.value;state.limit=50;renderTimeline();});
$('record-search').addEventListener('input',event=>{state.search=event.target.value;state.limit=50;renderTimeline();});
$('reset-filters').addEventListener('click',resetFilters);
$('clear-audience-focus').addEventListener('click',clearAudienceFocus);
$('audience-only-toggle').addEventListener('change',event=>{state.onlyFocused=event.target.checked&&state.focusedUser!==null;state.limit=50;renderTimeline();});
$('spacing-toggle').addEventListener('click',()=>{state.spacing=!state.spacing;$('spacing-toggle').textContent=state.spacing?'间隔视图':'紧凑视图';$('spacing-toggle').setAttribute('aria-pressed',String(state.spacing));renderTimeline();});
$('load-more').addEventListener('click',()=>{state.limit+=50;renderTimeline();});
renderTopicLegend();
fetchJSON('/api/fields').then(data=>{state.fields=new Map(data.fields.map(f=>[f.name,f]));}).catch(()=>{});
async function openLinkedRecord(){
  const params=new URLSearchParams(location.search);
  if(!params.has('author_id')||!params.has('live_stream_id'))return;
  const group=state.groups.find(g=>g.author_id===params.get('author_id')&&g.live_stream_id===params.get('live_stream_id'));
  if(!group){$('dataset-note').textContent+=' · 链接中的直播间不在当前数据中';return;}
  const linkedSource=state.source,loading=selectRoom(group),linkedToken=state.loadToken;
  await loading;
  if(state.source!==linkedSource||state.selected!==group||state.loadToken!==linkedToken||!state.records.length)return;
  if(params.has('user_id')){state.focusedUser=AudienceLabels.key(params.get('user_id'));state.onlyFocused=state.focusedUser!==null;}
  const targetIndex=filteredRecords().findIndex(r=>String(r.send_timestamp)===params.get('timestamp')&&(!params.has('user_id')||r.user_id===params.get('user_id')));
  state.limit=Math.max(50,targetIndex+1);renderTimeline();
  const row=Array.from(document.querySelectorAll('.timeline-row')).find(el=>el.dataset.recordTimestamp===params.get('timestamp')&&(!params.has('user_id')||el.dataset.recordUser===params.get('user_id')));
  if(row){row.classList.add('source-highlight');row.scrollIntoView({block:'center'});}
  else if(params.has('timestamp')){$('room-warning').hidden=false;$('room-warning').textContent+=' 链接中的记录未找到，请核对数据版本。';}
}
const requestedSource=new URLSearchParams(location.search).get('source');
if(['real','real_high','demo'].includes(requestedSource))$('source-select').value=requestedSource;
loadDataset().then(openLinkedRecord);
