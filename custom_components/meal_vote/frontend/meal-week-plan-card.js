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
    this.shadowRoot.innerHTML=`<style>
      :host{display:block;width:100%;max-width:none!important;min-width:0}
      *{box-sizing:border-box}
      ha-card{display:block;width:100%!important;max-width:none!important;min-width:0;margin:0;padding:12px}
      .head{display:flex;align-items:center;gap:10px;margin-bottom:12px}
      .head h2{margin:0;flex:1}.badge{font-size:.75rem;opacity:.55}
      .week{display:grid;width:100%;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;align-items:stretch}
      .day{border:1px solid var(--divider-color);border-radius:16px;padding:10px;min-width:0;background:var(--ha-card-background,var(--card-background-color))}
      .day h3{margin:0 0 9px;text-align:center;font-size:1rem}
      .meal{margin:7px 0;border:1px solid var(--divider-color);border-radius:13px;padding:11px 9px;background:var(--secondary-background-color);text-align:center;overflow-wrap:anywhere}
      .empty{padding:16px 4px;text-align:center;color:var(--secondary-text-color);font-size:.9rem}
      @media(max-width:1000px){.week{grid-template-columns:repeat(4,minmax(0,1fr))}}
      @media(max-width:650px){.week{grid-template-columns:repeat(2,minmax(0,1fr))}}
    </style>
    <ha-card>
      <div class="head"><h2>📅 Wochenplan</h2><span class="badge">UI 0.6.2</span></div>
      <div class="week">
        ${this.days().map(([key,label])=>{
          const dishes=(plan[key]||[]).map(id=>this.dish(id)).filter(Boolean);
          return `<div class="day"><h3>${label}</h3>${dishes.length?dishes.map(d=>`<div class="meal"><strong>${d.special?'⭐ ':''}${this.esc(d.name)}</strong></div>`).join(''):'<div class="empty">–</div>'}</div>`;
        }).join('')}
      </div>
    </ha-card>`;
  }
}
if(!customElements.get('meal-week-plan-card'))customElements.define('meal-week-plan-card',MealWeekPlanCard);
window.customCards=window.customCards||[];
window.customCards.push({type:'meal-week-plan-card',name:'Essenswahl Wochenplan',description:'Schreibgeschützte Wochenplan-Anzeige'});
