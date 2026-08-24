class MealWeekPlanAdminCard extends HTMLElement{
  constructor(){super();this.attachShadow({mode:'open'});this.hass=null;this.data={dishes:[],pantry:[],week_plan:{}};}
  setConfig(config){this.config=config||{};}
  set hass(h){if(!this._hass){this._hass=h;this.load();}else this._hass=h;}
  getCardSize(){return 6;}
  async ws(type,payload={}){return this._hass.callWS({type,...payload});}
  async load(){try{this.data=await this.ws('meal_vote/get_data');this.render();}catch(e){this.shadowRoot.innerHTML=`<ha-card><div style="padding:16px">Essenswahl: ${this.esc(e.message||e)}</div></ha-card>`;}}
  esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  stem(v){let s=String(v||'').trim().toLocaleLowerCase('de-DE');for(const e of ['ern','en','er','es','e','n','s']){if(s.length>5&&s.endsWith(e)){s=s.slice(0,-e.length);break;}}return s;}
  days(){return [['mon','Montag'],['tue','Dienstag'],['wed','Mittwoch'],['thu','Donnerstag'],['fri','Freitag'],['sat','Samstag'],['sun','Sonntag']];}
  dish(id){
    if(id==='__away__')return{id:'__away__',name:'Wir sind nicht da!',special:true};
    if(id==='__bread__')return{id:'__bread__',name:'Brot',special:true};
    return this.data.dishes.find(d=>d.id===id);
  }
  specialDishes(){return[{id:'__away__',name:'Wir sind nicht da!'},{id:'__bread__',name:'Brot'}];}
  activeDishes(){return [...this.specialDishes(),...this.data.dishes.filter(d=>d.active!==false).sort((a,b)=>a.name.localeCompare(b.name,'de'))];}
  async save(plan){await this.ws('meal_vote/set_week_plan',{plan});this.data.week_plan=plan;this.render();}
  render(){
    const plan=this.data.week_plan||{}, dishes=this.activeDishes();
    this.shadowRoot.innerHTML=`<style>
      :host{display:block;width:100%;max-width:none!important;min-width:0}*{box-sizing:border-box}ha-card{display:block;width:100%!important;max-width:none!important;min-width:0;margin:0;padding:12px}
      .weekShell{width:100%;max-width:none;min-width:0}
      .head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px}.head h2{margin:0;flex:1}.badge{font-size:.78rem;opacity:.65}
      .week{display:grid;width:100%;max-width:none;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;align-items:start}.day{border:1px solid var(--divider-color);border-radius:16px;padding:10px;min-width:0;background:var(--ha-card-background,var(--card-background-color))}
      .day h3{margin:0 0 9px;text-align:center;font-size:1rem}.meal{position:relative;margin:8px 0;border:1px solid var(--divider-color);border-radius:13px;overflow:hidden;background:var(--secondary-background-color)}
      .mealCard{min-height:86px;padding:10px 30px 10px 10px;display:flex;flex-direction:column;justify-content:center;gap:4px;cursor:pointer}.mealCard strong{line-height:1.2;overflow-wrap:anywhere}.mealCard small{opacity:.65}.mealRemove{position:absolute;right:5px;top:5px;border:0!important;background:transparent!important;padding:5px!important;font-size:1rem}.meal select{width:100%;min-width:0}.meal button,.add,.shop,.clear{border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color);border-radius:10px;padding:8px 10px;cursor:pointer}
      .add{width:100%;margin-top:5px}.picker{width:100%;font:inherit;border-radius:10px;border:1px solid var(--divider-color);padding:9px;background:var(--card-background-color);color:var(--primary-text-color)}
      @media(max-width:1000px){.week{grid-template-columns:repeat(4,minmax(0,1fr))}}@media(max-width:650px){.week{grid-template-columns:repeat(2,minmax(0,1fr))}}
      .footer{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:16px}.shop{background:var(--primary-color);color:var(--text-primary-color);font-weight:700}
      dialog{border:0;border-radius:18px;padding:0;background:var(--card-background-color);color:var(--primary-text-color);width:min(620px,94vw);max-height:88vh}.modal{padding:20px}.list{max-height:55vh;overflow:auto}.item{display:flex;gap:10px;align-items:center;padding:9px 4px;border-bottom:1px solid var(--divider-color)}.actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:15px}.actions button{padding:9px 12px;border-radius:10px;border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color)}
    </style><ha-card><div class="weekShell"><div class="head"><h2>🛠️ Wochenplan verwalten</h2><span class="badge">UI 0.6.11</span><button id="reload" class="clear">↻</button></div>
      <div class="week">${this.days().map(([key,label])=>{const ids=plan[key]||[];return `<div class="day"><h3>${label}</h3><div data-day="${key}">${ids.map((id,i)=>this.mealRow(key,id,i,dishes)).join('')}</div><button class="add" data-add="${key}">＋ Gericht</button></div>`}).join('')}</div>
      <div class="footer"><button id="clear" class="clear">Woche leeren</button><button id="shopping" class="shop">🛒 Wocheneinkauf erstellen</button></div>
      <dialog id="shopDialog"><div class="modal" id="shopModal"></div></dialog></div>
    </ha-card>`;
    this.shadowRoot.querySelector('#reload').onclick=()=>this.load();
    this.shadowRoot.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{const p=structuredClone(this.data.week_plan||{});(p[b.dataset.add]??=[]).push('');this.data.week_plan=p;this.render();});
    this.shadowRoot.querySelectorAll('[data-meal-select]').forEach(s=>s.onchange=async()=>{const [day,idx]=s.dataset.mealSelect.split(':');const p=structuredClone(this.data.week_plan||{});p[day]=p[day]||[];p[day][Number(idx)]=s.value;p[day]=p[day].filter(Boolean);await this.save(p);});this.shadowRoot.querySelectorAll('[data-change]').forEach(c=>c.onclick=()=>{const [day,idx]=c.dataset.change.split(':');this.showPicker(day,idx);});
    this.shadowRoot.querySelectorAll('[data-remove]').forEach(b=>b.onclick=async()=>{const [day,idx]=b.dataset.remove.split(':');const p=structuredClone(this.data.week_plan||{});p[day]=(p[day]||[]).filter((_,i)=>i!==Number(idx));await this.save(p);});
    this.shadowRoot.querySelector('#clear').onclick=async()=>{if(confirm('Den gesamten Wochenplan leeren?'))await this.save({});};
    this.shadowRoot.querySelector('#shopping').onclick=()=>this.openShopping();
  }
  mealRow(day,id,idx,dishes){
    const d=this.dish(id);
    if(!id||!d)return `<div class="meal"><select class="picker" data-meal-select="${day}:${idx}"><option value="">Gericht wählen …</option>${dishes.map(x=>`<option value="${this.esc(x.id)}">${this.esc(x.name)}</option>`).join('')}</select><button class="mealRemove" data-remove="${day}:${idx}" title="Entfernen">✕</button></div>`;
    return `<div class="meal"><div class="mealCard" data-change="${day}:${idx}" title="Gericht ändern"><strong>${d.special?'⭐ ':''}${this.esc(d.name)}</strong><small>${d.special?'Systemeintrag':'Antippen zum Ändern'}</small></div><button class="mealRemove" data-remove="${day}:${idx}" title="Entfernen">✕</button></div>`;
  }
  showPicker(day,idx){
    const p=structuredClone(this.data.week_plan||{}),current=(p[day]||[])[Number(idx)]||'',dishes=this.activeDishes();
    const container=this.shadowRoot.querySelector(`[data-day="${day}"]`);
    const meals=[...container.querySelectorAll('.meal')];
    const el=meals[Number(idx)];if(!el)return;
    el.innerHTML=`<select class="picker"><option value="">Gericht wählen …</option>${dishes.map(d=>`<option value="${this.esc(d.id)}" ${d.id===current?'selected':''}>${this.esc(d.name)}</option>`).join('')}</select>`;
    const sel=el.querySelector('select');sel.focus();sel.onchange=async()=>{p[day]=p[day]||[];p[day][Number(idx)]=sel.value;p[day]=p[day].filter(Boolean);await this.save(p);};
  }
  openShopping(){
    const planned=[];for(const [day] of this.days())for(const id of (this.data.week_plan?.[day]||[])){const d=this.dish(id);if(d)planned.push(d);}
    if(!planned.length){alert('Im Wochenplan sind noch keine Gerichte eingetragen.');return;}
    const pantry=new Set((this.data.pantry||[]).map(x=>this.stem(x))), dialog=this.shadowRoot.querySelector('#shopDialog'),modal=this.shadowRoot.querySelector('#shopModal');
    let rows='';planned.forEach(d=>(d.ingredients||[]).forEach((i,idx)=>{const home=pantry.has(this.stem(i.name));rows+=`<label class="item"><input type="checkbox" data-ref="${this.esc(d.id)}:${idx}" ${home?'':'checked'}><span><strong>${this.esc([i.amount,i.unit].filter(Boolean).join(' '))}</strong> ${this.esc(i.name)} ${home?'🏠':''}<small> · ${this.esc(d.name)}</small></span></label>`;}));
    modal.innerHTML=`<h2>🛒 Wocheneinkauf</h2><div>Standardvorrat 🏠 ist nicht vorausgewählt.</div><div class="list">${rows||'Keine Zutaten hinterlegt.'}</div><div class="actions"><button id="none">Keine</button><button id="all">Alle</button><button id="cancel">Abbrechen</button><button id="send">Auswahl hinzufügen</button></div>`;
    modal.querySelector('#none').onclick=()=>modal.querySelectorAll('[data-ref]').forEach(x=>x.checked=false);modal.querySelector('#all').onclick=()=>modal.querySelectorAll('[data-ref]').forEach(x=>x.checked=true);modal.querySelector('#cancel').onclick=()=>dialog.close();
    modal.querySelector('#send').onclick=async()=>{const refs=[...modal.querySelectorAll('[data-ref]:checked')].map(x=>{const [dish_id,index]=x.dataset.ref.split(':');return{dish_id,index:Number(index)}});if(!refs.length){alert('Bitte mindestens eine Zutat auswählen.');return;}const b=modal.querySelector('#send');b.disabled=true;try{const r=await this.ws('meal_vote/add_week_to_shopping_list',{ingredient_refs:refs});alert(`Wocheneinkauf: ${r.added||0} neu · ${r.updated||0} ergänzt · ${r.already_present||0} vorhanden.`);dialog.close();}catch(e){alert(e.message||e);}finally{b.disabled=false;}};
    dialog.showModal();
  }
}
if(!customElements.get('meal-week-plan-admin-card'))customElements.define('meal-week-plan-admin-card',MealWeekPlanAdminCard);
window.customCards=window.customCards||[];window.customCards.push({type:'meal-week-plan-admin-card',name:'Essenswahl Wochenplan Verwaltung',description:'Wochenplan bearbeiten und Wocheneinkauf erstellen'});
