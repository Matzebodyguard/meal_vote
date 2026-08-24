class MealWeekPlanCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode:'open'});
    this._hass = null;
    this.data = {dishes:[], week_plan:{}};
    this._timer = null;
  }
  setConfig(config){this.config=config||{};}
  set hass(hass){
    const first=!this._hass;
    this._hass=hass;
    if(first){
      this.load();
      this._timer=setInterval(()=>this.load(),600000);
    }
  }
  disconnectedCallback(){if(this._timer){clearInterval(this._timer);this._timer=null;}}
  getCardSize(){return 5;}
  esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  async ws(type,payload={}){return this._hass.callWS({type,...payload});}
  async load(){
    if(!this._hass)return;
    try{this.data=await this.ws('meal_vote/get_data');this.render();}
    catch(e){this.shadowRoot.innerHTML=`<ha-card><div style="padding:16px">Wochenplan konnte nicht geladen werden: ${this.esc(e.message||e)}</div></ha-card>`;}
  }
  days(){return [['mon','Montag'],['tue','Dienstag'],['wed','Mittwoch'],['thu','Donnerstag'],['fri','Freitag'],['sat','Samstag'],['sun','Sonntag']];}
  dish(id){
    if(id==='__away__')return{id:'__away__',name:'Wir sind nicht da!',special:true};
    if(id==='__bread__')return{id:'__bread__',name:'Brot',special:true};
    return (this.data.dishes||[]).find(d=>d.id===id);
  }
  render(){
    const plan=this.data.week_plan||{};
    const todayIndex=(new Date().getDay()+6)%7;
    this.shadowRoot.innerHTML=`<style>
      :host{display:block;width:100%;max-width:none!important;min-width:0}
      *{box-sizing:border-box}
      ha-card{display:block;width:100%!important;max-width:none!important;min-width:0;margin:0;padding:14px;background:var(--ha-card-background,var(--card-background-color));border-radius:20px}
      .head{display:flex;align-items:center;gap:10px;margin-bottom:14px}.head h2{margin:0;flex:1;font-size:1.45rem;font-weight:800}.badge{font-size:.72rem;opacity:.45}
      .week{display:grid;width:100%;grid-template-columns:repeat(7,minmax(0,1fr));gap:10px;align-items:stretch}
      .day{border:1px solid var(--divider-color);border-radius:18px;padding:10px;min-width:0;min-height:150px;background:var(--secondary-background-color);display:flex;flex-direction:column;gap:9px}
      .day.today{outline:2px solid var(--primary-color);outline-offset:-2px}
      .dayHeader{display:flex;align-items:center;justify-content:center;gap:6px;min-height:30px;padding:4px 6px 7px;border-bottom:1px solid var(--divider-color)}
      .dayHeader h3{margin:0;text-align:center;font-size:1rem;font-weight:800}.todayDot{width:7px;height:7px;border-radius:50%;background:var(--primary-color);flex:0 0 auto}
      .meal{position:relative;border-radius:14px;overflow:hidden;background:var(--card-background-color);border:1px solid var(--divider-color);box-shadow:var(--ha-card-box-shadow)}
      .mealImg{width:100%;height:86px;object-fit:cover;display:block;background:var(--secondary-background-color)}
      .mealBody{padding:10px;min-height:54px;display:flex;align-items:center;justify-content:center;text-align:center}.mealBody strong{font-size:.98rem;line-height:1.2;overflow-wrap:anywhere}
      .special{min-height:78px;display:flex;align-items:center;justify-content:center;text-align:center;padding:12px;font-weight:800;font-size:1rem}
      .empty{flex:1;display:flex;align-items:center;justify-content:center;min-height:80px;color:var(--secondary-text-color);opacity:.35;font-size:1.6rem}
      @media(max-width:1000px){.week{grid-template-columns:repeat(4,minmax(0,1fr))}}
      @media(max-width:650px){.week{grid-template-columns:repeat(2,minmax(0,1fr))}}
    </style>
    <ha-card>
      <div class="head"><h2>📅 Wochenplan</h2><span class="badge">UI 0.6.14</span></div>
      <div class="week">
        ${this.days().map(([key,label],index)=>{
          const dishes=(plan[key]||[]).map(id=>this.dish(id)).filter(Boolean);
          const isToday=index===todayIndex;
          return `<div class="day ${isToday?'today':''}">
            <div class="dayHeader">${isToday?'<span class="todayDot"></span>':''}<h3>${label}</h3></div>
            ${dishes.length?dishes.map(d=>d.special
              ? `<div class="meal special">⭐ ${this.esc(d.name)}</div>`
              : `<div class="meal">${d.image_url?`<img class="mealImg" src="${this.esc(d.image_url)}" loading="lazy">`:''}<div class="mealBody"><strong>${this.esc(d.name)}</strong></div></div>`
            ).join(''):'<div class="empty">·</div>'}
          </div>`;
        }).join('')}
      </div>
    </ha-card>`;
  }
}
if(!customElements.get('meal-week-plan-card'))customElements.define('meal-week-plan-card',MealWeekPlanCard);
window.customCards=window.customCards||[];
window.customCards.push({type:'meal-week-plan-card',name:'Essenswahl Wochenplan',description:'Schreibgeschützte Wochenplan-Anzeige'});
