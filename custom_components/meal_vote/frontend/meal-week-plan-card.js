class MealWeekPlanCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode:'open'});
    this._hass = null;
    this.data = {dishes:[], week_plan:{}};
    this._timer = null;this._rotationTimer=null;this._rotationIndex={};
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
  disconnectedCallback(){if(this._timer){clearInterval(this._timer);this._timer=null;}if(this._rotationTimer){clearInterval(this._rotationTimer);this._rotationTimer=null;}}
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
    if(id==='__away__')return{id:'__away__',name:'Wir sind nicht da!',special:true,image_url:'/meal_vote_static/special-away.webp?v=0.6.26'};
    if(id==='__bread__')return{id:'__bread__',name:'Brot',special:true,image_url:'/meal_vote_static/special-bread.webp?v=0.6.26'};
    return (this.data.dishes||[]).find(d=>d.id===id);
  }
  startRotation(){
    if(this._rotationTimer){clearInterval(this._rotationTimer);this._rotationTimer=null;}
    const rotating=this.days().filter(([key])=>(this.data.week_plan?.[key]||[]).length>1);
    if(!rotating.length)return;
    this._rotationTimer=setInterval(()=>{
      for(const [key] of rotating){
        const count=(this.data.week_plan?.[key]||[]).length;
        if(count>1)this._rotationIndex[key]=((this._rotationIndex[key]||0)+1)%count;
      }
      this.updateRotatingMeals();
    },6000);
  }

  updateRotatingMeals(){
    for(const [key] of this.days()){
      const ids=this.data.week_plan?.[key]||[];
      const host=this.shadowRoot.querySelector(`[data-day-meal="${key}"]`);
      if(!host)continue;
      if(!ids.length){host.innerHTML='<div class="empty">·</div>';continue;}
      const idx=Math.min(this._rotationIndex[key]||0,ids.length-1);
      const d=this.dish(ids[idx]);
      host.innerHTML=d?this.mealDisplayHtml(d,ids.length,idx):'<div class="empty">·</div>';
    }
  }

  mealDisplayHtml(d,count=1,idx=0){
    const dots=count>1?`<div class="rotateDots">${Array.from({length:count},(_,i)=>`<span class="${i===idx?'active':''}"></span>`).join('')}</div>`:'';
    return `<div class="meal">${d.image_url?`<img class="mealImg" src="${this.esc(d.image_url)}" loading="lazy">`:''}<div class="mealBody"><strong>${this.esc(d.name)}</strong></div>${dots}</div>`;
  }

  render(){
    const plan=this.data.week_plan||{};
    const todayIndex=(new Date().getDay()+6)%7;
    this.shadowRoot.innerHTML=`<style>
      :host{display:block;width:100%;max-width:none!important;min-width:0}
      *{box-sizing:border-box}
      ha-card{display:block;width:100%!important;max-width:none!important;min-width:0;margin:0;padding:7px 10px;background:var(--ha-card-background,var(--card-background-color));border-radius:20px}
      
      .week{display:grid;width:100%;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px;align-items:stretch}
      .day{border:1px solid var(--divider-color);border-radius:14px;padding:7px;min-width:0;min-height:105px;background:var(--secondary-background-color);display:flex;flex-direction:column;gap:6px}
      .day.today{outline:2px solid var(--primary-color);outline-offset:-2px}
      .dayHeader{display:flex;align-items:center;justify-content:center;gap:6px;min-height:24px;padding:2px 4px 5px;border-bottom:1px solid var(--divider-color)}
      .dayHeader h3{margin:0;text-align:center;font-size:.9rem;font-weight:800}.todayDot{width:7px;height:7px;border-radius:50%;background:var(--primary-color);flex:0 0 auto}
      .meal{position:relative;border-radius:11px;overflow:hidden;background:var(--card-background-color);border:1px solid var(--divider-color);box-shadow:var(--ha-card-box-shadow)}
      .mealImg{width:100%;height:52px;object-fit:cover;display:block;background:var(--secondary-background-color)}
      .mealBody{padding:6px;min-height:34px;display:flex;align-items:center;justify-content:center;text-align:center}.mealBody strong{font-size:.88rem;line-height:1.15;overflow-wrap:anywhere}.mealSlot{min-height:92px;display:flex;flex-direction:column;justify-content:center}.rotateDots{display:flex;justify-content:center;gap:4px;padding:0 0 5px}.rotateDots span{width:5px;height:5px;border-radius:50%;background:var(--divider-color)}.rotateDots span.active{background:var(--primary-color)}
      .special{min-height:48px;display:flex;align-items:center;justify-content:center;text-align:center;padding:7px;font-weight:800;font-size:.9rem}
      .empty{flex:1;display:flex;align-items:center;justify-content:center;min-height:45px;color:var(--secondary-text-color);opacity:.35;font-size:1.6rem}
      @media(max-width:1000px){.week{grid-template-columns:repeat(4,minmax(0,1fr))}}
      @media(max-width:650px){.week{grid-template-columns:repeat(2,minmax(0,1fr))}}
    </style>
    <ha-card>
      
      <div class="week">
        ${this.days().map(([key,label],index)=>{
          const dishes=(plan[key]||[]).map(id=>this.dish(id)).filter(Boolean);
          const isToday=index===todayIndex;
          return `<div class="day ${isToday?'today':''}">
            <div class="dayHeader">${isToday?'<span class="todayDot"></span>':''}<h3>${label}</h3></div>
            <div class="mealSlot" data-day-meal="${key}">${dishes.length?this.mealDisplayHtml(dishes[Math.min(this._rotationIndex[key]||0,dishes.length-1)],dishes.length,Math.min(this._rotationIndex[key]||0,dishes.length-1)):'<div class="empty">·</div>'}</div>
          </div>`;
        }).join('')}
      </div>
    </ha-card>`;
    this.startRotation();
  }
}
if(!customElements.get('meal-week-plan-card'))customElements.define('meal-week-plan-card',MealWeekPlanCard);
window.customCards=window.customCards||[];
window.customCards.push({type:'meal-week-plan-card',name:'Essenswahl Wochenplan',description:'Schreibgeschützte Wochenplan-Anzeige'});
