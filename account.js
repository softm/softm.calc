import {getHistoryCloudSnapshot,applyHistoryCloudSnapshot,subscribeHistoryChanges} from './app.js';

// calc: Cloudflare identity plus explicit, opt-in calculation-history sync.
(() => {
  'use strict';
  const SITE = 'calc';
  const WORKER = 'https://softm-hannun-account.softm.workers.dev';
  const CLIENT_URL = 'https://softm.github.io/services/cloudflare-account/src/client.mjs?v=20261117-calc-history-1';
  const PROVIDERS = [
    {id:'google',label:'Google',mark:'G',unavailable:'연결 준비 중'},
    {id:'kakao',label:'카카오',mark:'',unavailable:'연결 준비 중'},
    {id:'naver',label:'네이버',mark:'N',unavailable:'승인 대기'}
  ];
  // Local Android WebView requires a separate native browser-return authentication bridge.
  if (location.protocol === 'file:' || location.hostname === 'appassets.androidplatform.net') return;
  const header = document.querySelector('.header-actions');
  if (!header || document.getElementById('calc-account-trigger')) return;

  const style = document.createElement('style');
  style.textContent = `
    .calc-account-trigger{display:inline-grid;place-items:center;flex:0 0 auto;width:40px;height:40px;padding:3px;border:1px solid var(--border,#d8e1eb);border-radius:50%;background:var(--surface,#fff);color:var(--ink,#243d54);cursor:pointer;overflow:hidden}
    .calc-account-trigger:hover,.calc-account-trigger[aria-expanded=true]{box-shadow:0 0 0 3px var(--accent-soft,#e9edf7);border-color:var(--accent,#7b4763)}
    .calc-account-trigger:focus-visible,.calc-account-dialog button:focus-visible,.calc-account-dialog a:focus-visible{outline:3px solid var(--accent,#7b4763);outline-offset:2px}
    .calc-account-avatar{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:var(--accent-soft,#edf3fb);font-size:15px;font-weight:800;overflow:hidden}
    .calc-account-avatar img{width:100%;height:100%;object-fit:cover}
    .calc-account-guest{display:block;width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .calc-account-trigger[aria-busy=true]{position:relative}
    .calc-account-trigger[aria-busy=true]::after{content:"";position:absolute;inset:0;border:2px solid transparent;border-top-color:var(--accent,#7b4763);border-radius:50%;animation:calc-account-spin .8s linear infinite}
    @keyframes calc-account-spin{to{transform:rotate(360deg)}}
    .calc-account-overlay{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:#101c2b88;padding:16px}
    .calc-account-overlay[hidden]{display:none!important}
    .calc-account-dialog{box-sizing:border-box;width:min(100%,410px);max-height:min(88dvh,720px);overflow:auto;padding:23px;border-radius:20px;background:#fff;color:#172b42;box-shadow:0 22px 70px #0003;font:14px/1.5 system-ui,sans-serif}
    .calc-account-dialog *{box-sizing:border-box}
    .calc-account-title{margin:0;font-size:21px;font-weight:800;letter-spacing:-.5px}
    .calc-account-description{margin:9px 0 17px;color:#5e6a79;font-size:13px;line-height:1.7}
    .calc-account-providers{display:grid;gap:10px}
    .calc-account-provider{display:flex;align-items:center;justify-content:center;gap:9px;width:100%;min-height:50px;border-radius:12px;font-weight:750;font-size:14px;border:1px solid transparent;transition:filter .15s;cursor:pointer}
    .calc-account-provider:not(:disabled):hover{filter:brightness(.97)}
    .calc-account-provider:disabled{cursor:not-allowed;opacity:.6}
    .calc-account-provider.google{background:#fff;color:#202124;border-color:#dadce0}
    .calc-account-provider.kakao{background:#fee500;color:#191919;border-color:#fee500}
    .calc-account-provider.naver{background:#03c75a;color:#fff;border-color:#03c75a}
    .calc-account-provider-mark{display:grid;place-items:center;position:relative;width:26px;height:26px;flex:0 0 auto;font-size:19px;font-weight:900}
    .calc-account-provider.google .calc-account-provider-mark{font-family:Arial,sans-serif;background:conic-gradient(#4285f4 0 25%,#34a853 25% 50%,#fbbc05 50% 70%,#ea4335 70% 87%,#4285f4 87%);background-clip:text;-webkit-background-clip:text;color:transparent}
    .calc-account-provider.kakao .calc-account-provider-mark::before{content:"";width:22px;height:17px;display:block;background:#191919;border-radius:55%}
    .calc-account-provider.kakao .calc-account-provider-mark::after{content:"";position:absolute;width:8px;height:7px;left:4px;bottom:2px;transform:rotate(28deg);background:#191919}
    .calc-account-user{display:flex;align-items:center;gap:12px;margin:16px 0;padding:12px;background:#f5f7fa;border-radius:12px}
    .calc-account-user .calc-account-avatar{width:42px;height:42px;flex:0 0 auto}
    .calc-account-user strong{display:block;overflow-wrap:anywhere}
    .calc-account-user span{display:block;color:#64748b;font-size:12px}
    .calc-account-actions{display:flex;flex-direction:column;gap:8px;margin-top:12px}
    .calc-account-actions a,.calc-account-actions button{display:block;width:100%;min-height:42px;text-align:center;text-decoration:none;border:1px solid #dce4ed;border-radius:10px;background:#f7f9fc;color:#23415d;font:600 13px/1.5 system-ui,sans-serif;padding:10px;cursor:pointer}
    .calc-account-actions button:hover,.calc-account-actions a:hover{background:#eaf1f8}
    .calc-account-status{min-height:20px;margin:12px 0 0;color:#b13a48;font-size:12px;overflow-wrap:anywhere}
    .calc-account-footnote{margin:14px 0 0;color:#64748b;font-size:11px;line-height:1.6}
    @media(max-width:440px){.calc-account-trigger{width:36px;height:36px}.calc-account-avatar{width:30px;height:30px}.calc-account-dialog{padding:19px}}
    @media(prefers-reduced-motion:reduce){.calc-account-trigger[aria-busy=true]::after{animation:none;border-color:var(--accent,#7b4763)}.calc-account-provider{transition:none}}
  `;
  document.head.append(style);

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.id = 'calc-account-trigger';
  trigger.className = 'calc-account-trigger';
  trigger.setAttribute('aria-haspopup','dialog');
  trigger.setAttribute('aria-expanded','false');
  header.append(trigger);

  const overlay = document.createElement('div');
  overlay.className = 'calc-account-overlay';
  overlay.hidden = true;
  overlay.innerHTML = `
    <section class="calc-account-dialog" role="dialog" aria-modal="true" aria-labelledby="calc-account-title">
      <h2 class="calc-account-title" id="calc-account-title">한눈 공통 계정</h2>
      <p class="calc-account-description" id="calc-account-description"></p>
      <div id="calc-account-guest" class="calc-account-providers"></div>
      <div id="calc-account-signed" hidden>
        <div class="calc-account-user"><div class="calc-account-avatar" id="calc-account-user-avatar"></div><div><strong id="calc-account-name"></strong><span id="calc-account-provider"></span></div></div>
        <div class="calc-account-actions"><button id="calc-history-sync" type="button">계산 이력 동기화 켜기</button><button id="calc-history-delete" type="button">Cloudflare 계산 이력 삭제</button><a id="calc-account-manage" target="_blank" rel="noopener noreferrer">계정 관리</a><button id="calc-account-logout" type="button">로그아웃</button></div>
      </div>
      <p class="calc-account-status" id="calc-account-status" role="status" aria-live="polite"></p>
      <p class="calc-account-footnote">계산 이력은 동기화를 직접 켠 경우에만 암호화해 Cloudflare에 보관합니다. 계산노트는 계속 이 기기에만 저장됩니다.</p>
      <div class="calc-account-actions"><button type="button" id="calc-account-close">닫기</button></div>
    </section>`;
  document.body.append(overlay);
  overlay.querySelector('#calc-account-manage').href = WORKER + '/account';
  const dialog = overlay.querySelector('.calc-account-dialog');
  const description = overlay.querySelector('#calc-account-description');
  const guest = overlay.querySelector('#calc-account-guest');
  const signed = overlay.querySelector('#calc-account-signed');
  const status = overlay.querySelector('#calc-account-status');
  const closeButton = overlay.querySelector('#calc-account-close');
  const logoutButton = overlay.querySelector('#calc-account-logout');
  const syncButton = overlay.querySelector('#calc-history-sync');
  const deleteHistoryButton = overlay.querySelector('#calc-history-delete');
  const buttons = new Map();
  let client = null, loading = null, busy = false, previousOverflow = '', syncEnabled = false, syncBusy = false, syncTimer = 0;
  const enabled = {google:true,kakao:false,naver:false};

  function guestIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24');
    svg.setAttribute('class','calc-account-guest');
    svg.setAttribute('aria-hidden','true');
    svg.innerHTML = '<circle cx="12" cy="8" r="3.5"/><path d="M4.5 21v-2a7.5 7.5 0 0 1 15 0v2"/>';
    return svg;
  }
  function safePhoto(value) {
    if (typeof value !== 'string' || value.length > 2048) return '';
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
    } catch { return ''; }
  }
  function paintAvatar(container,user) {
    container.replaceChildren();
    const initial = [...String(user.displayName || '한눈 계정')][0] || '한';
    const fallback = document.createElement('span');
    fallback.textContent = initial;
    container.append(fallback);
    const url = safePhoto(user.photoURL);
    if (!url) return;
    const img = document.createElement('img');
    img.alt = '';
    img.referrerPolicy = 'no-referrer';
    img.decoding = 'async';
    img.onload = () => { if (img.isConnected) fallback.hidden = true; };
    img.onerror = () => { img.remove(); fallback.hidden = false; };
    img.src = url;
    container.append(img);
  }
  function currentUser() { return client?.currentUser || null; }
  const syncKey = uid => 'calc.cloud-history.v1:' + uid;
  function same(a,b) { return JSON.stringify(a) === JSON.stringify(b); }
  function mergeHistory(left,right) {
    const values = new Map();
    const offer = (kind,value) => {
      const previous = values.get(value.id);
      const time = Date.parse(value.updatedAt);
      if (!previous || time > previous.time || (time === previous.time && kind === 'deleted')) values.set(value.id,{kind,time,value});
    };
    for (const item of left.items) offer('item',item);
    for (const item of right.items) offer('item',item);
    for (const item of left.tombstones) offer('deleted',item);
    for (const item of right.tombstones) offer('deleted',item);
    const items=[],tombstones=[];
    for (const record of values.values()) (record.kind === 'item' ? items : tombstones).push(record.value);
    items.sort((a,b) => Date.parse(b.createdAt)-Date.parse(a.createdAt));
    tombstones.sort((a,b) => Date.parse(a.updatedAt)-Date.parse(b.updatedAt));
    return {version:1,items,tombstones:tombstones.slice(-5000)};
  }
  function syncLabel() {
    if (syncBusy) return '계산 이력 동기화 중…';
    return syncEnabled ? '계산 이력 동기화 켜짐' : '계산 이력 동기화 켜기';
  }
  async function synchronize() {
    if (!syncEnabled || syncBusy || !currentUser()) return;
    syncBusy = true; render(); setStatus('계산 이력을 동기화하고 있습니다.');
    try {
      for (let attempt=0;attempt<3;attempt++) {
        const remote = await client.exchangeCalcHistory('GET');
        const local = getHistoryCloudSnapshot();
        const merged = mergeHistory(local,remote.history);
        if (!same(local,merged)) applyHistoryCloudSnapshot(merged);
        if (same(remote.history,merged)) { setStatus('계산 이력이 동기화되었습니다.'); return; }
        try {
          await client.exchangeCalcHistory('POST',{expectedRevision:remote.revision,history:merged});
          setStatus('계산 이력이 Cloudflare에 안전하게 보관되었습니다.'); return;
        } catch (error) { if (error.code !== 'revision-conflict') throw error; }
      }
      throw Error('다른 기기의 변경과 겹쳤습니다. 잠시 후 다시 시도해 주세요.');
    } catch (error) { setStatus(error?.message || '계산 이력을 동기화하지 못했습니다. 기기 기록은 그대로 유지됩니다.'); }
    finally { syncBusy = false; render(); }
  }
  async function enableSync() {
    const user=currentUser();if(!user||syncBusy)return;
    if (!syncEnabled) {
      const accepted=window.confirm('이 기기의 계산 이력을 로그인한 계정에 합치고, 이후 변경을 Cloudflare에 암호화해 보관할까요?\n\n계산노트는 동기화하지 않습니다.');
      if(!accepted)return;
      localStorage.setItem(syncKey(user.uid),'enabled');syncEnabled=true;render();
    }
    await synchronize();
  }
  function scheduleSync() { if (!syncEnabled) return; clearTimeout(syncTimer); syncTimer=setTimeout(()=>void synchronize(),700); }
  async function deleteCloudHistory() {
    const user=currentUser();if(!user||syncBusy)return;
    const accepted=window.confirm('Cloudflare에 보관된 계산 이력을 모두 삭제할까요?\n\n이 기기의 계산 이력과 계산노트는 유지됩니다. 삭제한 클라우드 이력은 복구하기 어렵습니다.');
    if(!accepted)return;
    syncBusy=true;render();setStatus('Cloudflare 계산 이력을 삭제하고 있습니다.');
    try {
      await client.exchangeCalcHistory('DELETE');
      localStorage.removeItem(syncKey(user.uid));syncEnabled=false;
      setStatus('Cloudflare 계산 이력을 삭제했습니다. 이 기기의 기록은 유지됩니다.');
    } catch(error) {setStatus(error?.message||'Cloudflare 계산 이력을 삭제하지 못했습니다.');}
    finally {syncBusy=false;render();}
  }
  function render() {
    const user = currentUser();
    trigger.replaceChildren();
    if (user) {
      const avatar = document.createElement('span');
      avatar.className = 'calc-account-avatar';
      paintAvatar(avatar,user);
      trigger.append(avatar);
    } else trigger.append(guestIcon());
    trigger.setAttribute('aria-label',user ? '내 계정 메뉴 열기' : '로그인 및 회원가입');
    trigger.title = user ? '내 계정' : '로그인 · 회원가입';
    trigger.setAttribute('aria-busy',String(busy));
    guest.hidden = Boolean(user);
    signed.hidden = !user;
    if (user) {
      const name = String(user.displayName || '한눈 계정').trim() || '한눈 계정';
      const provider = {google:'Google',kakao:'카카오',naver:'네이버'}[user.provider] || '한눈 공통 계정';
      description.textContent = '로그인된 계정으로 계산기를 사용하고 있습니다.';
      overlay.querySelector('#calc-account-name').textContent = name;
      overlay.querySelector('#calc-account-provider').textContent = provider + ' · 로그인됨';
      paintAvatar(overlay.querySelector('#calc-account-user-avatar'),user);
    } else description.textContent = 'Google·카카오·네이버 중 하나로 로그인하세요. 처음 이용하면 SNS 인증 후 회원가입이 진행됩니다.';
    for (const {id,label,unavailable} of PROVIDERS) {
      const button = buttons.get(id);
      button.disabled = busy || !enabled[id];
      button.querySelector('.calc-account-provider-label').textContent = enabled[id] ? label + '로 계속하기' : label + ' · ' + unavailable;
    }
    logoutButton.disabled = busy;
    syncButton.disabled = busy || syncBusy;
    deleteHistoryButton.disabled = busy || syncBusy;
    syncButton.textContent = syncLabel();
  }
  async function ensureClient() {
    if (client) return client;
    if (!loading) loading = import(CLIENT_URL).then(module => module.createCloudflareAccountClient({baseUrl:WORKER,siteId:SITE}));
    try { client = await loading; return client; }
    finally { loading = null; }
  }
  function setStatus(message = '') {status.textContent = message;}
  function show() {
    render();
    setStatus();
    overlay.hidden = false;
    trigger.setAttribute('aria-expanded','true');
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    (currentUser() ? logoutButton : buttons.get('google')).focus();
    void refreshProviders();
  }
  function close() {
    if (busy) return;
    overlay.hidden = true;
    trigger.setAttribute('aria-expanded','false');
    document.body.style.overflow = previousOverflow;
    trigger.focus({preventScroll:true});
  }
  async function refreshProviders() {
    try {
      const response = await fetch(WORKER + '/health',{cache:'no-store'});
      if (!response.ok) return;
      const result = await response.json();
      if (result.providers && typeof result.providers === 'object') {
        for (const {id} of PROVIDERS) enabled[id] = result.providers[id] === true;
        render();
      }
    } catch { /* Offline calculation continues. */ }
  }
  async function signIn(provider) {
    if (busy || !enabled[provider]) return;
    // Must happen in the click handler, before awaiting network or module loading.
    const popup = window.open('about:blank','_blank','popup,width=480,height=780');
    if (!popup) {setStatus('브라우저에서 로그인 팝업을 허용해 주세요.');return;}
    busy = true;
    render();
    setStatus('SNS 인증을 진행하고 있습니다.');
    try {
      const account = await ensureClient();
      await account.login({provider,popup});
      const user=currentUser();syncEnabled=Boolean(user&&localStorage.getItem(syncKey(user.uid))==='enabled');
      render();
      if(syncEnabled)void synchronize();
      closeAfterLogin();
    } catch (error) {
      try {popup.close();} catch {}
      setStatus(error?.message || '로그인에 실패했습니다. 다시 시도해 주세요.');
    } finally {busy = false;render();}
  }
  function closeAfterLogin() {
    overlay.hidden = true;
    trigger.setAttribute('aria-expanded','false');
    document.body.style.overflow = previousOverflow;
    trigger.focus({preventScroll:true});
  }
  async function signOut() {
    if (busy || !client) return;
    busy = true;
    render();
    setStatus('로그아웃하고 있습니다.');
    try {syncEnabled=false;clearTimeout(syncTimer);await client.logout();setStatus('로그아웃되었습니다.');}
    catch {setStatus(client.currentUser ? '로그아웃에 실패했습니다.' : '이 기기에서 로그아웃되었습니다.');}
    finally {busy = false;render();}
  }
  for (const {id,mark} of PROVIDERS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'calc-account-provider ' + id;
    button.dataset.provider = id;
    const emblem = document.createElement('span');
    emblem.className = 'calc-account-provider-mark';
    emblem.setAttribute('aria-hidden','true');
    emblem.textContent = mark;
    const caption = document.createElement('span');
    caption.className = 'calc-account-provider-label';
    button.append(emblem,caption);
    button.addEventListener('click',() => void signIn(id));
    guest.append(button);
    buttons.set(id,button);
  }
  trigger.addEventListener('click',show);
  closeButton.addEventListener('click',close);
  logoutButton.addEventListener('click',() => void signOut());
  syncButton.addEventListener('click',() => void enableSync());
  deleteHistoryButton.addEventListener('click',() => void deleteCloudHistory());
  overlay.addEventListener('click',event => {if (event.target === overlay) close();});
  document.addEventListener('keydown',event => {
    if (overlay.hidden) return;
    if (event.key === 'Escape') {event.preventDefault();close();return;}
    if (event.key !== 'Tab') return;
    const items = [...dialog.querySelectorAll('button:not(:disabled),a[href]')].filter(node => !node.closest('[hidden]'));
    const first = items[0],last = items[items.length-1];
    if (event.shiftKey && document.activeElement === first) {event.preventDefault();last?.focus();}
    else if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first?.focus();}
  });
  render();
  window.SoftmAccounts ||= new Map();
  window.SoftmAccounts.set(SITE,{
    get currentUser() {return currentUser();},
    login:signIn,logout:signOut,open:show,syncHistory:enableSync
  });
  window.dispatchEvent(new CustomEvent('softm:account-ready',{detail:{siteId:SITE,backend:'cloudflare'}}));
  subscribeHistoryChanges(scheduleSync);
  void ensureClient().then(() => {const user=currentUser();syncEnabled=Boolean(user&&localStorage.getItem(syncKey(user.uid))==='enabled');render();if(syncEnabled)void synchronize();}).catch(() => { /* Guest button remains; retry on click. */ });
})();
