class MealVoteCard extends HTMLElement {
  setConfig(config){this.config=config||{};this._search='';this._category='Alle';this._showInactive=false;this._sort='votes';this.attachShadow({mode:'open'});}
  set hass(hass){this._hass=hass;if(!this._initialized){this._initialized=true;this.load();}}
  connectedCallback(){if(!this._refreshTimer){this._refreshTimer=setInterval(()=>{if(!this.isConnected||this._loaded||!this._hass)return;const open=[...(this.shadowRoot?.querySelectorAll('dialog')||[])].some(d=>d.open);const a=this.shadowRoot?.activeElement;const editing=open||(a&&['INPUT','SELECT','TEXTAREA'].includes(a.tagName));if(!editing)this.load();},600000);}}
  disconnectedCallback(){if(this._refreshTimer){clearInterval(this._refreshTimer);this._refreshTimer=null;}}
  async load(){this._loaded=true;try{this.data=await this._hass.connection.sendMessagePromise({type:'meal_vote/get_data'});this.render();}catch(e){this.shadowRoot.innerHTML=`<ha-card><div style="padding:16px">Essenswahl konnte nicht geladen werden: ${this.esc(e.message||e)}</div></ha-card>`;}finally{this._loaded=false;}}
  async call(service,data={}){await this._hass.callService('meal_vote',service,data);await this.load();}
  async ws(type,data={}){return await this._hass.connection.sendMessagePromise({type,...data});}
  render(){
    const source=this.data.dishes.filter(d=>this._showInactive||d.active!==false);
    const cats=['Alle',...new Set(source.flatMap(d=>(d.categories&&d.categories.length?d.categories:[d.category]).filter(Boolean)))];
    const dishes=this.filteredDishes();
    const sync=this.data.sync||{};const syncText=sync.error?'⚠ NAS offline – lokaler Stand':(sync.last_ok?`✓ Sync ${new Date(sync.last_ok).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}`:'Noch nicht synchronisiert');
    this.shadowRoot.innerHTML=`<style>
      :host{display:block;width:100%;max-width:none}*{box-sizing:border-box}ha-card{padding:16px;width:100%;max-width:none}
      .top{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:10px}input,select,button,textarea{font:inherit;border-radius:12px;border:1px solid var(--divider-color);padding:10px 12px;background:var(--card-background-color);color:var(--primary-text-color)}button{cursor:pointer}.searchWrap{position:relative;display:flex;flex:1;min-width:220px}.searchWrap input.search{width:100%;padding-right:44px}.searchClear{position:absolute;right:5px;top:50%;transform:translateY(-50%);border:0;background:transparent;padding:7px 10px;min-width:34px;font-size:1.15rem;line-height:1;opacity:.72}.searchClear:hover{opacity:1}.status{font-size:.85rem;opacity:.72;margin-bottom:12px}.status.error{color:var(--error-color)}
      .cats{display:flex;gap:8px;overflow:auto;margin-bottom:14px}.cats button.active{background:var(--primary-color);color:var(--text-primary-color)}.grid{width:100%;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}.dish{border:1px solid var(--divider-color);border-radius:18px;overflow:hidden;background:var(--ha-card-background,var(--card-background-color))}.dish.inactive{opacity:.58}.pic{width:100%;height:155px;object-fit:cover;background:var(--secondary-background-color);display:block}.placeholder{display:grid;place-items:center;font-size:42px}.body{padding:14px}.nameRow{display:flex;gap:8px;align-items:flex-start}.name{font-size:1.22rem;font-weight:700;flex:1}.edit{padding:6px 9px}.meta{opacity:.75;margin-top:3px}.history{font-size:.9rem;margin-top:6px;opacity:.85}.voters{min-height:26px;margin:10px 0;line-height:1.4}.actions,.subactions{display:flex;gap:8px;flex-wrap:wrap}.vote{flex:1;font-weight:700}.subactions{margin-top:8px}.subactions button{flex:1}.add{margin-left:auto}
      dialog{border:1px solid var(--divider-color);border-radius:18px;background:var(--card-background-color);color:var(--primary-text-color);width:min(820px,calc(100vw - 24px));padding:0;box-shadow:0 12px 45px rgba(0,0,0,.35)}dialog::backdrop{background:rgba(0,0,0,.5)}.modal{padding:18px}.modal h2{margin:0 0 16px}.field{display:flex;flex-direction:column;gap:6px;margin:12px 0}.field input,.field textarea{width:100%}.field textarea{min-height:120px}.check{display:flex;gap:8px;align-items:center}.modalActions{display:flex;gap:8px;justify-content:flex-end;margin-top:18px;flex-wrap:wrap}.danger{color:var(--error-color)}.preview{width:100%;height:180px;object-fit:cover;border-radius:12px;background:var(--secondary-background-color);margin-top:8px}.hint{font-size:.85rem;opacity:.7}.peopleGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-top:14px}.personVote{min-height:58px;font-weight:700;font-size:1.05rem}.personVote.selected{background:var(--primary-color);color:var(--text-primary-color)}.ingredientList{display:grid;gap:8px}.ingredient{padding:10px;border:1px solid var(--divider-color);border-radius:10px}.empty{padding:28px;text-align:center;opacity:.7}.ingredientEditor{display:grid;gap:9px;margin-top:8px}.ingredientHead,.ingredientRow{display:grid;grid-template-columns:minmax(180px,2fr) minmax(90px,.7fr) minmax(110px,.8fr) auto;gap:8px;align-items:center}.ingredientHead{font-size:.78rem;font-weight:700;opacity:.65;padding:0 4px}.ingredientRow{border:1px solid var(--divider-color);border-radius:12px;padding:8px;background:var(--secondary-background-color)}.ingredientRow input{min-width:0;width:100%}.ingredientTools{display:flex;gap:4px}.ingredientTools button{padding:8px 9px;min-width:38px}.ingredientAdd{width:100%;margin-top:8px;border-style:dashed;font-weight:700}.ingredientEmpty{padding:14px;border:1px dashed var(--divider-color);border-radius:12px;text-align:center;opacity:.7}
      @media(max-width:600px){ha-card{padding:10px}.pic{height:130px}.actions,.subactions{flex-direction:column}.add{margin-left:0}.top>*{flex:1 1 auto}.ingredientHead{display:none}.ingredientRow{grid-template-columns:1fr 90px 110px}.ingredientTools{grid-column:1/-1;justify-content:flex-end}}

      .ingredient-name-wrap{position:relative;min-width:0}
      .ingredient-suggestions{position:absolute;z-index:100;left:0;right:0;top:calc(100% + 4px);background:var(--card-background-color,#fff);border:1px solid var(--divider-color,#ddd);border-radius:10px;box-shadow:0 4px 14px rgba(0,0,0,.2);max-height:220px;overflow:auto;display:none}
      .ingredient-suggestions.open{display:block}
      .ingredient-suggestion{padding:10px 12px;cursor:pointer;display:flex;justify-content:space-between;gap:10px}
      .ingredient-suggestion:hover{background:var(--secondary-background-color,#f5f5f5)}
      .ingredient-suggestion small{color:var(--secondary-text-color);white-space:nowrap}
          .ingredientTools button.pantryActive{background:var(--primary-color);color:var(--text-primary-color);font-weight:700}
</style><ha-card>
      <div class="top"><div class="searchWrap"><input class="search" id="search" placeholder="🔎 Gericht, Kategorie, Person oder Zutat suchen…" value="${this.esc(this._search)}"><button type="button" class="searchClear" id="searchClear" title="Suche löschen" aria-label="Suche löschen" style="${this._search?'':'display:none'}">✕</button></div><select id="sort"><option value="votes">Meiste Stimmen</option><option value="oldest">Lange nicht gekocht</option><option value="recent">Zuletzt gekocht</option><option value="name">Name</option></select><span style="font-size:.8rem;opacity:.7;font-weight:700">UI 0.6.20</span><button id="reload">↻ Sync</button><button id="inactive">${this._showInactive?'Aktive':'Verwaltung'}</button>${this._showInactive?`<button id="pantry">🏠 Standardvorrat</button><button id="optimizeImages">🖼 Bilder optimieren</button><button id="importRecipe">📥 Rezept importieren</button><button id="add" class="add">＋ Gericht</button>`:''}</div>
      <div class="status ${sync.error?'error':''}">${this.esc(syncText)} · automatisch alle ${sync.interval_minutes||10} Min.</div>
      <div class="cats">${cats.map(c=>`<button data-cat="${this.esc(c)}" class="${c===this._category?'active':''}">${this.esc(c)}</button>`).join('')}</div>
      <div class="grid">${dishes.length?dishes.map(d=>this.dishHtml(d)).join(''):'<div class="empty">Keine Gerichte gefunden.</div>'}</div>
      <dialog id="dishDialog"><div class="modal" id="dishModal"></div></dialog><dialog id="voteDialog"><div class="modal" id="voteModal"></div></dialog><dialog id="infoDialog"><div class="modal" id="infoModal"></div></dialog><dialog id="shoppingDialog"><div class="modal" id="shoppingModal"></div></dialog><dialog id="pantryDialog"><div class="modal" id="pantryModal"></div></dialog><dialog id="importDialog"><div class="modal" id="importModal"></div></dialog>
    </ha-card>`;
    const sort=this.shadowRoot.querySelector('#sort');sort.value=this._sort;sort.onchange=e=>{this._sort=e.target.value;this.updateDishGrid();};
    const searchInput=this.shadowRoot.querySelector('#search');
    const searchClear=this.shadowRoot.querySelector('#searchClear');
    searchInput.oninput=e=>{
      this._search=e.target.value;
      if(searchClear)searchClear.style.display=this._search?'':'none';
      this.updateDishGrid();
    };
    if(searchClear)searchClear.onclick=()=>{
      this._search='';
      searchInput.value='';
      searchClear.style.display='none';
      this.updateDishGrid();
      searchInput.focus();
    };this.shadowRoot.querySelector('#reload').onclick=()=>this.call('reload');this.shadowRoot.querySelector('#importRecipe')&&(this.shadowRoot.querySelector('#importRecipe').onclick=()=>this.openImportDialog());this.shadowRoot.querySelector('#add')&&(this.shadowRoot.querySelector('#add').onclick=()=>this.openDishDialog());this.shadowRoot.querySelector('#pantry')&&(this.shadowRoot.querySelector('#pantry').onclick=()=>this.openPantryDialog());this.shadowRoot.querySelector('#optimizeImages')&&(this.shadowRoot.querySelector('#optimizeImages').onclick=async()=>{if(!confirm('Bestehende Gerichtsbilder optimieren? Es werden neue WebP-Dateien angelegt und die Gerichtsliste darauf umgestellt. Die Originaldateien bleiben auf dem NAS erhalten.'))return;const b=this.shadowRoot.querySelector('#optimizeImages');b.disabled=true;try{const r=await this.ws('meal_vote/optimize_images');alert(`${r.optimized||0} Bilder optimiert · ${r.skipped||0} übersprungen`);await this.load();}catch(e){alert(e.message||e);}finally{b.disabled=false;}});this.shadowRoot.querySelector('#inactive').onclick=()=>{
      this._showInactive=!this._showInactive;
      this._category='Alle';
      this.updateModeUI();
    };this.shadowRoot.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{
      this._category=b.dataset.cat;
      this.updateCategoryButtons();
      this.updateDishGrid();
    });this.shadowRoot.querySelectorAll('[data-vote]').forEach(b=>b.onclick=()=>this.openVoteDialog(this.findDish(b.dataset.vote)));this.shadowRoot.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>this.openDishDialog(this.findDish(b.dataset.edit)));this.shadowRoot.querySelectorAll('[data-cooked]').forEach(b=>b.onclick=()=>{if(confirm('Dieses Gericht als gekocht markieren? Nur seine Stimmen werden gelöscht.'))this.call('mark_cooked',{dish_id:b.dataset.cooked});});this.shadowRoot.querySelectorAll('[data-ing]').forEach(b=>b.onclick=()=>this.openIngredients(this.findDish(b.dataset.ing)));this.shadowRoot.querySelectorAll('[data-shop]').forEach(b=>b.onclick=()=>this.openShoppingDialog(this.findDish(b.dataset.shop)));
  }
  filteredDishes(){
    const source=this.data.dishes.filter(d=>this._showInactive||d.active!==false);
    const q=(this._search||'').toLocaleLowerCase('de-DE');
    let dishes=source.filter(d=>{
      const ing=(d.ingredients||[]).map(i=>i.name).join(' ').toLocaleLowerCase('de-DE');
      const cats=(d.categories||[d.category]).filter(Boolean).join(' ').toLocaleLowerCase('de-DE');
      return (!q
        || d.name.toLocaleLowerCase('de-DE').includes(q)
        || cats.includes(q)
        || (d.voters||[]).join(' ').toLocaleLowerCase('de-DE').includes(q)
        || ing.includes(q))
        && (this._category==='Alle'||(d.categories||[d.category]).includes(this._category));
    });
    dishes.sort((a,b)=>this.sorter(a,b));
    return dishes;
  }

  updateModeUI(){
    const source=this.data.dishes.filter(d=>this._showInactive||d.active!==false);
    const cats=['Alle',...new Set(source.flatMap(d=>(d.categories&&d.categories.length?d.categories:[d.category]).filter(Boolean)))];

    const catsEl=this.shadowRoot.querySelector('.cats');
    if(catsEl){
      catsEl.innerHTML=cats.map(c=>`<button data-cat="${this.esc(c)}" class="${c===this._category?'active':''}">${this.esc(c)}</button>`).join('');
      catsEl.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{
        this._category=b.dataset.cat;
        this.updateCategoryButtons();
        this.updateDishGrid();
      });
    }

    const inactive=this.shadowRoot.querySelector('#inactive');
    if(inactive)inactive.textContent=this._showInactive?'Aktive':'Verwaltung';

    this.updateAdminButtons();
    this.updateDishGrid();
  }

  updateAdminButtons(){
    const top=this.shadowRoot.querySelector('.top');
    if(!top)return;

    ['pantry','optimizeImages','importRecipe','add'].forEach(id=>top.querySelector(`#${id}`)?.remove());

    if(!this._showInactive)return;

    const html=`<button id="pantry">🏠 Standardvorrat</button>
      <button id="optimizeImages">🖼 Bilder optimieren</button>
      <button id="importRecipe">📥 Rezept importieren</button>
      <button id="add" class="add">＋ Gericht</button>`;
    top.insertAdjacentHTML('beforeend',html);

    top.querySelector('#pantry').onclick=()=>this.openPantryDialog();
    top.querySelector('#importRecipe').onclick=()=>this.openImportDialog();
    top.querySelector('#add').onclick=()=>this.openDishDialog();
    top.querySelector('#optimizeImages').onclick=async()=>{
      if(!confirm('Bestehende Gerichtsbilder optimieren? Es werden neue WebP-Dateien angelegt und die Gerichtsliste darauf umgestellt. Die Originaldateien bleiben auf dem NAS erhalten.'))return;
      const b=top.querySelector('#optimizeImages');b.disabled=true;
      try{
        const r=await this.ws('meal_vote/optimize_images');
        alert(`${r.optimized||0} Bilder optimiert · ${r.skipped||0} übersprungen`);
        await this.load();
      }catch(e){alert(e.message||e);}
      finally{if(b)b.disabled=false;}
    };
  }

  updateCategoryButtons(){
    this.shadowRoot.querySelectorAll('[data-cat]').forEach(b=>{
      b.classList.toggle('active', b.dataset.cat===this._category);
    });
  }

  updateDishGrid(){
    const grid=this.shadowRoot.querySelector('.grid');
    if(!grid)return;
    const dishes=this.filteredDishes();
    grid.innerHTML=dishes.length
      ? dishes.map(d=>this.dishHtml(d)).join('')
      : '<div class="empty">Keine Gerichte gefunden.</div>';

    this.shadowRoot.querySelectorAll('[data-vote]').forEach(b=>b.onclick=()=>this.openVoteDialog(this.findDish(b.dataset.vote)));
    this.shadowRoot.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>this.openDishDialog(this.findDish(b.dataset.edit)));
    this.shadowRoot.querySelectorAll('[data-cooked]').forEach(b=>b.onclick=()=>{if(confirm('Dieses Gericht als gekocht markieren? Nur seine Stimmen werden gelöscht.'))this.call('mark_cooked',{dish_id:b.dataset.cooked});});
    this.shadowRoot.querySelectorAll('[data-ing]').forEach(b=>b.onclick=()=>this.openIngredients(this.findDish(b.dataset.ing)));
    this.shadowRoot.querySelectorAll('[data-shop]').forEach(b=>b.onclick=()=>this.openShoppingDialog(this.findDish(b.dataset.shop)));
  }

  sorter(a,b){if(this._sort==='name')return a.name.localeCompare(b.name,'de');if(this._sort==='recent')return(this.time(b.last_cooked)-this.time(a.last_cooked))||a.name.localeCompare(b.name,'de');if(this._sort==='oldest'){const ta=this.time(a.last_cooked),tb=this.time(b.last_cooked);if(!ta&&!tb)return a.name.localeCompare(b.name,'de');if(!ta)return-1;if(!tb)return 1;return ta-tb;}return b.vote_count-a.vote_count||a.name.localeCompare(b.name,'de');}
  time(v){return v?new Date(v).getTime():0;} findDish(id){return this.data.dishes.find(d=>d.id===id);}
  relativeDate(v){if(!v)return'noch nie';const days=Math.floor((Date.now()-new Date(v).getTime())/86400000);if(days<=0)return'heute';if(days===1)return'gestern';return`vor ${days} Tagen`;}
  dishHtml(d){const cnt=(d.ingredients||[]).length;return`<div class="dish ${d.active===false?'inactive':''}">${d.image_url?`<img class="pic" src="${this.esc(d.image_url)}?v=${encodeURIComponent(this.data.sync?.last_ok||'0')}" loading="lazy">`:`<div class="pic placeholder">🍽️</div>`}<div class="body"><div class="nameRow"><div class="name">${this.esc(d.name)}${d.active===false?' (inaktiv)':''}</div><button class="edit" data-edit="${this.esc(d.id)}">✎</button></div><div class="meta">${this.esc((d.categories&&d.categories.length?d.categories.join(' · '):(d.category||'Ohne Kategorie')))} · ${d.vote_count} Stimme${d.vote_count===1?'':'n'}</div><div class="history">🍳 ${d.last_cooked?`zuletzt ${this.relativeDate(d.last_cooked)}`:'noch nie gekocht'}${d.times_cooked?` · ${d.times_cooked}× insgesamt`:''}</div><div class="voters">${d.voters.length?'👍 '+d.voters.map(x=>this.esc(x)).join(' · '):'Noch keine Stimmen'}</div>${d.active!==false?`<div class="actions"><button class="vote" data-vote="${this.esc(d.id)}">👍 Stimme geben</button><button data-cooked="${this.esc(d.id)}">🍳 Gekocht</button></div><div class="subactions"><button data-ing="${this.esc(d.id)}">🥕 Zutaten (${cnt})</button><button data-shop="${this.esc(d.id)}" ${cnt?'':'disabled'}>🛒 Einkaufsliste</button></div>`:''}</div></div>`;}
  openVoteDialog(dish){if(!dish)return;const dialog=this.shadowRoot.querySelector('#voteDialog'),modal=this.shadowRoot.querySelector('#voteModal'),voters=new Set(dish.voters||[]);modal.innerHTML=`<h2>Wer stimmt für ${this.esc(dish.name)}?</h2><div class="hint">Erneut antippen entfernt die Stimme.</div><div class="peopleGrid">${this.data.people.map(p=>`<button class="personVote ${voters.has(p)?'selected':''}" data-person="${this.esc(p)}">${voters.has(p)?'✓ ':''}${this.esc(p)}</button>`).join('')}</div><div class="modalActions"><button id="vClose">Fertig</button></div>`;modal.querySelector('#vClose').onclick=()=>dialog.close();modal.querySelectorAll('[data-person]').forEach(button=>{button.onclick=async()=>{button.disabled=true;try{await this._hass.callService('meal_vote','vote',{dish_id:dish.id,person:button.dataset.person});const selected=button.classList.toggle('selected');button.textContent=`${selected?'✓ ':''}${button.dataset.person}`;const current=new Set(dish.voters||[]);selected?current.add(button.dataset.person):current.delete(button.dataset.person);dish.voters=[...current].sort((a,b)=>a.localeCompare(b,'de'));dish.vote_count=dish.voters.length;}catch(e){alert(e.message||e);}finally{button.disabled=false;}};});dialog.addEventListener('close',()=>this.load(),{once:true});dialog.showModal();}
  openIngredients(dish){
    if(!dish)return;
    const dialog=this.shadowRoot.querySelector('#infoDialog'),modal=this.shadowRoot.querySelector('#infoModal');
    const items=dish.ingredients||[];
    modal.innerHTML=`<h2>🥕 ${this.esc(dish.name)}</h2>
      <div class="ingredientList">${items.length?items.map(i=>`<div class="ingredient"><strong>${this.esc([i.amount,i.unit].filter(Boolean).join(' '))}</strong> ${this.esc(i.name)}</div>`).join(''):'<div class="hint">Keine Zutaten hinterlegt.</div>'}</div>
      ${dish.recipe?`<div class="recipeBlock" style="margin-top:18px"><h3>📖 Rezept</h3><div style="white-space:pre-wrap;line-height:1.5">${this.esc(dish.recipe)}</div></div>`:''}
      <div class="modalActions"><button id="iClose">Schließen</button><button id="iShop" ${items.length?'':'disabled'}>🛒 Einkaufsliste</button></div>`;
    modal.querySelector('#iClose').onclick=()=>dialog.close();
    modal.querySelector('#iShop').onclick=()=>{dialog.close();this.openShoppingDialog(dish);};
    dialog.showModal();
  }
  openShoppingDialog(dish){if(!dish)return;const dialog=this.shadowRoot.querySelector('#shoppingDialog'),modal=this.shadowRoot.querySelector('#shoppingModal');const items=dish.ingredients||[];const pantry=new Set((this.data?.pantry||[]).map(x=>this.ingredientStem(x)));modal.innerHTML=`<h2>🛒 Einkaufsliste – ${this.esc(dish.name)}</h2><div class="hint">Standardvorrat ist mit 🏠 markiert und zunächst nicht ausgewählt.</div><div class="ingredientList" style="margin-top:12px">${items.map((i,idx)=>{const home=pantry.has(this.ingredientStem(i.name));return `<label class="ingredient check"><input type="checkbox" data-shop-index="${idx}" ${home?'':'checked'}><span><strong>${this.esc([i.amount,i.unit].filter(Boolean).join(' '))}</strong> ${this.esc(i.name)} ${home?'🏠':''}</span></label>`}).join('')}</div><div class="modalActions"><button id="sNone">Keine</button><button id="sAll">Alle</button><button id="sCancel">Abbrechen</button><button id="sAdd">Auswahl hinzufügen</button></div>`;modal.querySelector('#sCancel').onclick=()=>dialog.close();modal.querySelector('#sAll').onclick=()=>modal.querySelectorAll('[data-shop-index]').forEach(c=>c.checked=true);modal.querySelector('#sNone').onclick=()=>modal.querySelectorAll('[data-shop-index]').forEach(c=>c.checked=false);modal.querySelector('#sAdd').onclick=async()=>{const indices=[...modal.querySelectorAll('[data-shop-index]:checked')].map(c=>Number(c.dataset.shopIndex));if(!indices.length){alert('Bitte mindestens eine Zutat auswählen.');return;}modal.querySelector('#sAdd').disabled=true;try{await this.addToShopping(dish,indices);dialog.close();}finally{modal.querySelector('#sAdd').disabled=false;}};dialog.showModal();}
  openPantryDialog(){
    const dialog=this.shadowRoot.querySelector('#pantryDialog'),modal=this.shadowRoot.querySelector('#pantryModal');
    const selected=new Set((this.data?.pantry||[]).map(x=>this.ingredientStem(x)));
    const catalog=this.ingredientCatalog();
    modal.innerHTML=`<h2>🏠 Standardvorrat</h2><div class="hint">Diese Zutaten sind im Einkaufsdialog standardmäßig nicht angehakt.</div><div class="searchWrap" style="margin:12px 0"><input id="pantrySearch" class="search" placeholder="🔎 Zutat suchen…"><button type="button" class="searchClear" id="pantrySearchClear" title="Suche löschen" aria-label="Suche löschen" style="display:none">✕</button></div><div id="pantryList" class="ingredientList"></div><div class="modalActions"><button id="pCancel">Abbrechen</button><button id="pSave">Speichern</button></div>`;
    const list=modal.querySelector('#pantryList'),search=modal.querySelector('#pantrySearch');
    const render=()=>{const q=(search.value||'').toLocaleLowerCase('de-DE');list.innerHTML=catalog.filter(x=>!q||x.name.toLocaleLowerCase('de-DE').includes(q)).map(x=>`<label class="ingredient check"><input type="checkbox" data-pantry-name="${this.esc(x.name)}" ${selected.has(this.ingredientStem(x.name))?'checked':''}><span>${this.esc(x.name)}${x.unit?` <small>(${this.esc(x.unit)})</small>`:''}</span></label>`).join('')||'<div class="hint">Noch keine Zutaten vorhanden.</div>';};
    render();
    const pantryClear=modal.querySelector('#pantrySearchClear');
    search.oninput=()=>{if(pantryClear)pantryClear.style.display=search.value?'':'none';render();};
    if(pantryClear)pantryClear.onclick=()=>{search.value='';pantryClear.style.display='none';render();search.focus();};
    modal.querySelector('#pCancel').onclick=()=>dialog.close();
    modal.querySelector('#pSave').onclick=async()=>{const names=[...modal.querySelectorAll('[data-pantry-name]:checked')].map(x=>x.dataset.pantryName);try{await this.ws('meal_vote/set_pantry',{ingredients:names});dialog.close();await this.load();}catch(e){alert(e.message||e);}};
    dialog.showModal();
  }

  async addToShopping(dish,ingredientIndices=null){try{const payload={dish_id:dish.id};if(ingredientIndices)payload.ingredient_indices=ingredientIndices;const r=await this.ws('meal_vote/add_to_shopping_list',payload);const parts=[];if(r.added)parts.push(`${r.added} neu`);if(r.updated)parts.push(`${r.updated} ergänzt`);if(r.already_present)parts.push(`${r.already_present} bereits vorhanden`);alert(`Einkaufsliste ${r.todo_entity||this.data?.todo_entity||''}: ${parts.join(' · ')||'keine Änderung'}. Vorher erkannt: ${r.existing_count ?? '?'} offene Einträge.`);}catch(e){alert(e.message||e);}}
  parseIngredients(text){return String(text||'').split('\n').map(l=>l.trim()).filter(Boolean).map(line=>{const p=line.split(';').map(x=>x.trim());if(p.length>=3)return{amount:p[0],unit:p[1],name:p.slice(2).join(';')};return{name:line,amount:'',unit:''};});}

  categoryCatalog(){
    const set=new Set();
    for(const d of (this.data?.dishes||[])){
      for(const c of (d.categories&&d.categories.length?d.categories:[d.category]).filter(Boolean))set.add(String(c).trim());
    }
    return [...set].sort((a,b)=>a.localeCompare(b,'de'));
  }

  ingredientCatalog(){
    const sources = [];
    if (Array.isArray(this.data?.dishes)) sources.push(...this.data.dishes);
    if (Array.isArray(this._data?.dishes)) sources.push(...this._data.dishes);
    if (Array.isArray(this.data?.items)) sources.push(...this.data.items);

    const catalog = new Map();
    for (const dish of sources) {
      const list = Array.isArray(dish?.ingredients) ? dish.ingredients : [];
      for (const ing of list) {
        const name = String(ing?.name || '').trim();
        if (!name) continue;
        const key = name.toLocaleLowerCase('de-DE');
        if (!catalog.has(key)) catalog.set(key, {name, units:new Map(), count:0});
        const item = catalog.get(key);
        item.count++;
        const unit = String(ing?.unit || '').trim();
        if (unit) item.units.set(unit, (item.units.get(unit) || 0) + 1);
      }
    }
    return [...catalog.values()].map(item => ({
      name: item.name,
      unit: [...item.units.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0] || '',
      count: item.count
    })).sort((a,b)=>b.count-a.count || a.name.localeCompare(b.name,'de'));
  }

  normalizeIngredientText(value){
    return String(value || '')
      .toLocaleLowerCase('de-DE')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/ß/g,'ss')
      .replace(/[^a-z0-9äöü\s-]/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }

  ingredientStem(value){
    let s=this.normalizeIngredientText(value);
    const endings=['ern','en','er','es','e','n','s'];
    for(const end of endings){
      if(s.length>5 && s.endsWith(end)){s=s.slice(0,-end.length);break;}
    }
    return s;
  }

  levenshtein(a,b){
    a=this.normalizeIngredientText(a); b=this.normalizeIngredientText(b);
    const m=a.length,n=b.length;
    if(!m) return n; if(!n) return m;
    const prev=Array.from({length:n+1},(_,i)=>i);
    const cur=new Array(n+1);
    for(let i=1;i<=m;i++){
      cur[0]=i;
      for(let j=1;j<=n;j++){
        const cost=a[i-1]===b[j-1]?0:1;
        cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+cost);
      }
      for(let j=0;j<=n;j++) prev[j]=cur[j];
    }
    return prev[n];
  }

  ingredientMatches(value){
    const q=this.normalizeIngredientText(value);
    const qStem=this.ingredientStem(q);
    const catalog=this.ingredientCatalog();
    if(!q) return catalog.slice(0,8);

    const scored=catalog.map(item=>{
      const name=this.normalizeIngredientText(item.name);
      const stem=this.ingredientStem(name);
      let score=999;

      if(name===q) score=0;
      else if(name.startsWith(q)) score=1;
      else if(name.includes(q)) score=2;
      else if(stem===qStem && qStem.length>=3) score=3;
      else if(stem.startsWith(qStem) && qStem.length>=3) score=4;
      else {
        const dist=this.levenshtein(q,name);
        const stemDist=this.levenshtein(qStem,stem);
        const maxLen=Math.max(q.length,name.length,1);
        const rel=dist/maxLen;
        if((q.length>=4 && dist<=2) || (q.length>=6 && rel<=0.34) || (qStem.length>=4 && stemDist<=2)){
          score=10+Math.min(dist,stemDist);
        }
      }

      return {...item,_score:score};
    }).filter(x=>x._score<999)
      .sort((a,b)=>a._score-b._score || b.count-a.count || a.name.localeCompare(b.name,'de'));

    return scored.slice(0,8);
  }

  wireIngredientAutocomplete(row){
    const input = row.querySelector('[data-ing-name]');
    const unit = row.querySelector('[data-ing-unit]');
    const box = row.querySelector('.ingredient-suggestions');
    if (!input || !box) return;

    const renderSuggestions = () => {
      const matches = this.ingredientMatches(input.value);
      box.innerHTML = matches.map(item =>
        `<div class="ingredient-suggestion"
              data-suggest-name="${this.esc(item.name)}"
              data-suggest-unit="${this.esc(item.unit)}">
          <span>${this.esc(item.name)}</span>
          <small>${item.unit ? this.esc(item.unit) : ''}</small>
        </div>`
      ).join('');

      box.classList.toggle('open', matches.length > 0 && document.activeElement === input);

      box.querySelectorAll('.ingredient-suggestion').forEach(el => {
        el.addEventListener('mousedown', ev => {
          ev.preventDefault();
          input.value = el.dataset.suggestName || '';
          if (unit && !unit.value) unit.value = el.dataset.suggestUnit || '';
          box.classList.remove('open');
          input.dispatchEvent(new Event('input', {bubbles:true}));
          if (unit) unit.dispatchEvent(new Event('input', {bubbles:true}));
        });
      });
    };

    const applyKnownUnit=()=>{const exact=this.ingredientCatalog().find(x=>this.normalizeIngredientText(x.name)===this.normalizeIngredientText(input.value));if(exact&&unit&&!unit.value){unit.value=exact.unit||'';unit.dispatchEvent(new Event('input',{bubbles:true}));}};
    input.addEventListener('change',applyKnownUnit);
    input.addEventListener('input', renderSuggestions);
    input.addEventListener('focus', renderSuggestions);
    input.addEventListener('blur', () => setTimeout(() => box.classList.remove('open'), 120));
  }

  ingredientEditorHtml(items){const units=['g','kg','ml','l','Stück','Dose','Packung','EL','TL','Prise','Bund'];const names=this.ingredientCatalog();return `<div class="ingredientHead"><span>Zutat</span><span>Menge</span><span>Einheit</span><span></span></div><div class="ingredientEditor" id="ingredientEditor">${items.length?items.map((i,idx)=>`<div class="ingredientRow" data-ing-row="${idx}"><div class="ingredient-name-wrap"><input data-ing-name="${idx}" autocomplete="off" list="ingredientNames" placeholder="z. B. Tomaten" value="${this.esc(i.name||'')}"><div class="ingredient-suggestions"></div></div><input data-ing-amount="${idx}" inputmode="decimal" placeholder="z. B. 500" value="${this.esc(i.amount||'')}"><input data-ing-unit="${idx}" list="ingredientUnits" placeholder="z. B. g" value="${this.esc(i.unit||'')}"><div class="ingredientTools"><button type="button" data-ing-home="${idx}" class="${(this.data?.pantry||[]).some(x=>this.ingredientStem(x)===this.ingredientStem(i.name))?'pantryActive':''}" title="${(this.data?.pantry||[]).some(x=>this.ingredientStem(x)===this.ingredientStem(i.name))?'Im Standardvorrat – klicken zum Entfernen':'Als Standardvorrat markieren'}">🏠</button><button type="button" data-ing-up="${idx}" title="Nach oben" ${idx===0?'disabled':''}>↑</button><button type="button" data-ing-down="${idx}" title="Nach unten" ${idx===items.length-1?'disabled':''}>↓</button><button type="button" data-ing-delete="${idx}" class="danger" title="Zutat löschen">✕</button></div></div>`).join(''):'<div class="ingredientEmpty">Noch keine Zutaten. Mit „＋ Zutat“ kannst du die erste anlegen.</div>'}</div><datalist id="ingredientNames">${names.map(x=>`<option value="${this.esc(x.name)}"></option>`).join('')}</datalist><datalist id="ingredientUnits">${units.map(u=>`<option value="${u}"></option>`).join('')}</datalist><button type="button" id="addIngredient" class="ingredientAdd">＋ Zutat</button>`;}

  parseImportedRecipe(text){
    const raw=String(text||'').replace(/\r/g,'').replace(/\u00a0/g,' ').trim();
    if(!raw)return{name:'',categories:[],ingredients:[],recipe:''};

    const lines=raw.split('\n').map(x=>x.trim());
    let name='';
    let categories=[];
    let ingredients=[];
    let recipeLines=[];
    let mode='meta';
    let recipeStarted=false;
    let pendingStep=null;
    let pendingIngredientAmount=null;

    const cleanMarkdown=s=>String(s||'')
      .replace(/^#{1,6}\s*/,'')
      .replace(/\*\*/g,'')
      .replace(/\*/g,'')
      .replace(/\\:/g,':')
      .replace(/\\_/g,'_')
      .replace(/\[([^\]]+)\]\([^)]+\)/g,'$1')
      .trim();

    for(const line of lines){
      const m=line.match(/^#\s+(.+)$/);
      if(m){name=cleanMarkdown(m[1]);break;}
    }
    if(!name){
      const first=lines.find(line=>line && !/^!\[/.test(line) && !/^\[.*\]\(.*\)$/.test(line) && !/^©/.test(line));
      name=cleanMarkdown(first||'');
    }

    const normalizeUnit=u=>{
      const x=String(u||'').trim().replace(/\.$/,'').toLocaleLowerCase('de-DE');
      const map={
        'gramm':'g','g':'g','kilogramm':'kg','kg':'kg',
        'milliliter':'ml','ml':'ml','liter':'l','l':'l',
        'stück':'Stück','stk':'Stück',
        'dose':'Dose','dosen':'Dose',
        'packung':'Packung','päckchen':'Packung',
        'el':'EL','esslöffel':'EL',
        'tl':'TL','teelöffel':'TL',
        'prise':'Prise','bund':'Bund',
        'stängel':'Stängel','stengel':'Stängel',
        'zweig':'Zweig','zweige':'Zweig'
      };
      return map[x]||String(u||'').trim();
    };

    const parseAmountUnit=left=>{
      let value=cleanMarkdown(left).replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
      if(!value)return{amount:'',unit:''};
      if(/^n\.?\s*b\.?$/i.test(value))return{amount:'n. B.',unit:''};

      const unitOnly=value.match(/^(g|kg|ml|l|el|tl|stück|stk\.?|dose[n]?|packung|päckchen|prise|bund|stängel|stengel|zweig[e]?)$/i);
      if(unitOnly)return{amount:'',unit:normalizeUnit(unitOnly[1])};

      const normal=value.match(/^(\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+)\s*(g|kg|ml|l|el|tl|stück|stk\.?|dose[n]?|packung|päckchen|prise|bund|stängel|stengel|zweig[e]?)?\s*$/i);
      if(normal){
        return{
          amount:(normal[1]||'').replace(',','.'),
          unit:normalizeUnit(normal[2]||'')
        };
      }
      return null;
    };

    const parseTableIngredient=line=>{
      const rawLine=String(line||'').trim();
      if(!rawLine.startsWith('|'))return null;
      const parts=rawLine.split('|');
      if(parts.length<4)return null;

      const left=cleanMarkdown(parts[1]||'').trim();
      const right=cleanMarkdown(parts[2]||'').trim();

      const separatorCell=v=>/^:?-{3,}:?$/.test(String(v||'').replace(/\s/g,''));
      if(separatorCell(left)||separatorCell(right))return null;
      if(!right)return null;

      const au=parseAmountUnit(left) || {amount:'',unit:''};
      return{name:right,amount:au.amount,unit:au.unit};
    };

    const parseInlineIngredient=line=>{
      const s=cleanMarkdown(line).replace(/^[•\-–—]\s*/,'').trim();
      if(!s)return null;

      // "500 g Kartoffeln", "3 EL Sahne", "1 Schalotte"
      const m=s.match(/^(\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+|n\.?\s*b\.?)?\s*(g|kg|ml|l|el|tl|stück|stk\.?|dose[n]?|packung|päckchen|prise|bund|stängel|stengel|zweig[e]?)?\s+(.+)$/i);
      if(m && (m[1] || m[2])){
        return{
          name:(m[3]||'').trim(),
          amount:(m[1]||'').replace(',','.'),
          unit:normalizeUnit(m[2]||'')
        };
      }
      return null;
    };

    const isMetadata=line=>{
      const s=cleanMarkdown(line).toLocaleLowerCase('de-DE');
      return !s ||
        /^(©|time|difficulty_level|profil|arbeitszeit|gesamtzeit|koch-\/backzeit|ruhezeit|schwierigkeit|rezeptautor|rezeptautor:in|simpel|einfach|mittel|schwer)$/.test(s) ||
        /^\d+\s*min\.?$/.test(s) ||
        /^für\s+\d+\s+portion/.test(s) ||
        /^[]+$/.test(s);
    };

    for(let idx=0; idx<lines.length; idx++){
      const original=lines[idx];
      const line=cleanMarkdown(original);

      if(/^##\s+zutaten/i.test(original)||/^zutaten:?$/i.test(line)){
        mode='ingredients';
        pendingIngredientAmount=null;
        continue;
      }
      if(/^##\s+zubereitung/i.test(original)||/^(zubereitung|anleitung|zubereitungsschritte):?$/i.test(line)){
        mode='recipe';
        recipeStarted=false;
        pendingIngredientAmount=null;
        continue;
      }
      if(/^#\s+/.test(original))continue;

      if(mode==='ingredients'){
        if(!line||/^für\s+\d+\s+portion/i.test(line))continue;

        // Normal Markdown table row: | 500 g | Kartoffeln |
        if(original.includes('|')){
          const ing=parseTableIngredient(original);
          if(ing&&ing.name)ingredients.push(ing);
          continue;
        }

        // Rendered/copy-pasted tables often become:
        // 500 g
        // Kartoffeln
        // Detect the amount-only line and remember it for the next text line.
        const amountOnly=parseAmountUnit(line);
        if(amountOnly){
          pendingIngredientAmount=amountOnly;
          continue;
        }

        // If we have a pending amount/unit, the current line is the ingredient name.
        if(pendingIngredientAmount){
          ingredients.push({
            name:line,
            amount:pendingIngredientAmount.amount||'',
            unit:pendingIngredientAmount.unit||''
          });
          pendingIngredientAmount=null;
          continue;
        }

        // Inline form: 500 g Kartoffeln
        const inline=parseInlineIngredient(original);
        if(inline){
          ingredients.push(inline);
          continue;
        }

        // Quantity-less ingredient, e.g. "Salz und Pfeffer"
        // Only accept plain text if it is not metadata/separator noise.
        if(!isMetadata(line) && !/^[-:|]+$/.test(line)){
          ingredients.push({name:line,amount:'',unit:''});
        }
        continue;
      }

      if(mode==='recipe'){
        const step=original.match(/^\*\*(\d+)\*\*$/)||line.match(/^(\d+)$/);
        if(step){
          const number=Number(step[1]);
          if(number>=1&&number<=30){
            recipeStarted=true;
            pendingStep=number;
          }
          continue;
        }
        if(!recipeStarted){
          if(isMetadata(original))continue;
          continue;
        }
        if(!line||isMetadata(original))continue;
        recipeLines.push(`${pendingStep!==null?pendingStep+'. ':''}${line}`);
        pendingStep=null;
        continue;
      }
    }

    const seenIngredients=new Set();
    ingredients=ingredients.filter(i=>{
      const name=String(i.name||'').replace(/\s+/g,' ').trim();
      if(!name)return false;
      const key=[String(i.amount||'').trim(),String(i.unit||'').trim().toLocaleLowerCase('de-DE'),name.toLocaleLowerCase('de-DE')].join('|');
      if(seenIngredients.has(key))return false;
      seenIngredients.add(key);
      i.name=name;
      return true;
    });

    const searchable=(name+' '+raw).toLocaleLowerCase('de-DE');
    const categoryRules=[
      ['Pasta',/\b(pasta|fettuccine|spaghetti|nudeln?|penne|tagliatelle|linguine)\b/],
      ['Vegetarisch',/\bvegetarisch\b/],
      ['Vegan',/\bvegan\b/],
      ['Fleisch',/\b(hähnchen|huhn|hühnchen|hackfleisch|rind|schwein|pute)\b/],
      ['Fisch',/\b(lachs|fisch|thunfisch|forelle)\b/],
      ['Suppe',/\bsuppe\b/],
      ['Salat',/\bsalat\b/],
      ['Dessert',/\b(dessert|nachtisch)\b/],
      ['Backen',/\b(kuchen|backen|torte)\b/],
      ['Italienisch',/\b(italien|italienisch|römisch|rom|alfredo|fettuccine)\b/],
      ['Schnell',/\b(10\s*min|schnell)\b/]
    ];
    for(const [cat,rx] of categoryRules)if(rx.test(searchable))categories.push(cat);
    categories=[...new Set(categories)];

    return{name,categories,ingredients,recipe:recipeLines.join('\n\n').trim()};
  }

  runImportParserSelfTest(){
    const sample=`# Kartoffelgratin

## Zutaten
500 g
Kartoffeln
125 ml
Milch
3 EL
Sahne
Salz und Pfeffer

## Zubereitung
1
Kartoffeln schneiden.`;
    const r=this.parseImportedRecipe(sample);
    const expected=[
      ['Kartoffeln','500','g'],
      ['Milch','125','ml'],
      ['Sahne','3','EL'],
      ['Salz und Pfeffer','','']
    ];
    const actual=(r.ingredients||[]).map(i=>[i.name||'',i.amount||'',i.unit||'']);
    const ok=expected.length===actual.length && expected.every((x,i)=>x.every((v,j)=>actual[i]?.[j]===v));
    if(!ok)console.error('[meal_vote] Import parser self-test failed', {expected,actual});
    else console.info('[meal_vote] Import parser self-test OK');
    return ok;
  }

  openImportDialog(){
    this.runImportParserSelfTest();
    const dialog=this.shadowRoot.querySelector('#importDialog'),modal=this.shadowRoot.querySelector('#importModal');
    modal.innerHTML=`<h2>📥 Rezept importieren</h2>
      <div class="hint">Kopiere Titel, Zutaten und Zubereitung eines Rezepts hier hinein. Der Inhalt wird lokal im Browser ausgewertet.</div>
      <textarea id="importText" rows="16" style="width:100%;margin-top:12px" placeholder="Beispiel:\nSpaghetti Bolognese\n\nZutaten:\n500 g Hackfleisch\n500 g Spaghetti\n2 Dosen Tomaten\n\nZubereitung:\n..."></textarea>
      <div id="importPreview" style="margin-top:14px"></div>
      <div class="modalActions"><button id="importCancel">Abbrechen</button><button id="importAnalyze">Analysieren</button><button id="importCreate" disabled>Als neues Gericht übernehmen</button></div>`;
    let parsed=null;
    const preview=modal.querySelector('#importPreview');
    modal.querySelector('#importCancel').onclick=()=>dialog.close();
    modal.querySelector('#importAnalyze').onclick=()=>{
      parsed=this.parseImportedRecipe(modal.querySelector('#importText').value);
      preview.innerHTML=`<div><strong>Titel:</strong> ${this.esc(parsed.name||'—')}</div>
        <div style="margin-top:6px"><strong>Kategorien:</strong> ${parsed.categories.length?parsed.categories.map(x=>this.esc(x)).join(', '):'—'}</div>
        <div style="margin-top:6px"><strong>Zutaten:</strong> ${parsed.ingredients.length}</div>
        <div style="margin-top:8px;max-height:240px;overflow:auto;border:1px solid var(--divider-color);border-radius:10px;padding:8px">
          ${(parsed.ingredients||[]).map(i=>`<div style="padding:3px 0"><strong>${this.esc(i.name||'')}</strong> · Menge: ${this.esc(i.amount||'—')} · Einheit: ${this.esc(i.unit||'—')}</div>`).join('')}
        </div>
        <div style="margin-top:6px"><strong>Rezepttext:</strong> ${parsed.recipe?this.esc(parsed.recipe.slice(0,220))+(parsed.recipe.length>220?' …':''):'—'}</div>`;
      modal.querySelector('#importCreate').disabled=!parsed.name;
    };
    modal.querySelector('#importCreate').onclick=async()=>{
      if(!parsed||!parsed.name)return;
      try{
        const normalizedIngredients=(parsed.ingredients||[]).map(i=>{
          const name=String(i.name||'').trim();
          return {
            name,
            ingredient:name,
            amount:String(i.amount||'').trim(),
            unit:String(i.unit||'').trim()
          };
        }).filter(i=>i.name);
        const r=await this.ws('meal_vote/add_dish',{
          name:parsed.name,
          category:parsed.categories[0]||'',
          categories:parsed.categories,
          recipe:parsed.recipe,
          image:'',
          ingredients:normalizedIngredients
        });
        dialog.close();
        await this.load();
        const created=this.findDish(r.dish_id);
        if(created)this.openDishDialog(created);
      }catch(e){alert(e.message||e);}
    };
    dialog.showModal();
    setTimeout(()=>modal.querySelector('#importText')?.focus(),0);
  }

  openDishDialog(dish=null){
    const dialog=this.shadowRoot.querySelector('#dishDialog'),modal=this.shadowRoot.querySelector('#dishModal'),editing=!!dish;
    const ingredientDraft=(dish?.ingredients||[]).map(i=>({name:i.name||'',amount:i.amount||'',unit:i.unit||''}));
    modal.innerHTML=`<h2>${editing?'Gericht bearbeiten':'Neues Gericht'}</h2><div class="field"><label>Name</label><input id="dName" value="${this.esc(dish?.name||'')}"></div><div class="field"><label>Kategorien</label><div id="categoryEditor"></div><span class="hint">Mehrere Kategorien möglich. Neue Kategorien können frei eingegeben werden.</span></div><div class="field"><label>Zutaten</label><div id="ingredientEditorWrap"></div><span class="hint">Menge und Einheit sind optional. Die Reihenfolge wird auch in der Zutatenansicht verwendet. · Autocomplete-Katalog: ${this.ingredientCatalog().length} Zutaten</span></div><div class="field"><label>Rezept</label><textarea id="dRecipe" rows="8" placeholder="Zubereitung, Hinweise oder Link …">${this.esc(dish?.recipe||'')}</textarea></div><div class="field"><label>Bildpfad auf dem NAS</label><input id="dImage" value="${this.esc(dish?.image||'')}" placeholder="images/lasagne.jpg"></div><div class="field"><label>Bild hochladen</label><input id="dFile" type="file" accept="image/jpeg,image/png,image/webp">${dish?.image_url?`<img class="preview" src="${this.esc(dish.image_url)}">`:''}</div>${editing?`<label class="check"><input id="dActive" type="checkbox" ${dish.active!==false?'checked':''}> Gericht aktiv</label>`:''}<div class="modalActions">${editing?'<button id="dDelete" class="danger">Endgültig löschen</button>':''}<button id="dCancel">Abbrechen</button><button id="dSave">Speichern</button></div>`;
    const categoryWrap=modal.querySelector('#categoryEditor');
    let categoryDraft=[...(dish?.categories&&dish.categories.length?dish.categories:(dish?.category?[dish.category]:[]))];
    const renderCategories=()=>{
      const all=this.categoryCatalog();
      categoryWrap.innerHTML=`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${categoryDraft.map((c,i)=>`<span style="display:inline-flex;align-items:center;gap:5px;border:1px solid var(--divider-color);border-radius:999px;padding:6px 9px">${this.esc(c)}<button type="button" data-cat-del="${i}" style="padding:2px 5px">✕</button></span>`).join('')}</div><input id="catInput" list="categoryNames" placeholder="Kategorie hinzufügen …"><datalist id="categoryNames">${all.map(c=>`<option value="${this.esc(c)}"></option>`).join('')}</datalist><button type="button" id="catAdd" style="margin-left:6px">＋</button>`;
      categoryWrap.querySelectorAll('[data-cat-del]').forEach(b=>b.onclick=()=>{categoryDraft.splice(Number(b.dataset.catDel),1);renderCategories();});
      const input=categoryWrap.querySelector('#catInput');
      const add=()=>{const v=input.value.trim();if(v&&!categoryDraft.some(x=>x.toLocaleLowerCase('de-DE')===v.toLocaleLowerCase('de-DE'))){categoryDraft.push(v);renderCategories();}};
      categoryWrap.querySelector('#catAdd').onclick=add;
      input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();add();}};
    };
    renderCategories();
    const wrap=modal.querySelector('#ingredientEditorWrap');
    const syncDraftFromInputs=()=>{ingredientDraft.forEach((item,idx)=>{const n=wrap.querySelector(`[data-ing-name="${idx}"]`),a=wrap.querySelector(`[data-ing-amount="${idx}"]`),u=wrap.querySelector(`[data-ing-unit="${idx}"]`);if(n)item.name=n.value;if(a)item.amount=a.value;if(u)item.unit=u.value;});};
    const renderIngredients=()=>{wrap.innerHTML=this.ingredientEditorHtml(ingredientDraft);wrap.querySelectorAll('[data-ing-name]').forEach(el=>el.oninput=()=>ingredientDraft[Number(el.dataset.ingName)].name=el.value);wrap.querySelectorAll('[data-ing-amount]').forEach(el=>el.oninput=()=>ingredientDraft[Number(el.dataset.ingAmount)].amount=el.value);wrap.querySelectorAll('[data-ing-unit]').forEach(el=>el.oninput=()=>ingredientDraft[Number(el.dataset.ingUnit)].unit=el.value);wrap.querySelectorAll('[data-ing-row]').forEach(row=>this.wireIngredientAutocomplete(row));wrap.querySelectorAll('[data-ing-home]').forEach(b=>b.onclick=async()=>{syncDraftFromInputs();const i=Number(b.dataset.ingHome),name=(ingredientDraft[i]?.name||'').trim();if(!name){alert('Bitte zuerst einen Zutatennamen eingeben.');return;}const current=[...(this.data?.pantry||[])];const stem=this.ingredientStem(name);const exists=current.some(x=>this.ingredientStem(x)===stem);const next=exists?current.filter(x=>this.ingredientStem(x)!==stem):[...current,name];try{await this.ws('meal_vote/set_pantry',{ingredients:next});this.data.pantry=next;b.classList.toggle('pantryActive',!exists);b.title=!exists?'Im Standardvorrat – klicken zum Entfernen':'Als Standardvorrat markieren';b.textContent='🏠';}catch(e){alert(e.message||e);}});wrap.querySelectorAll('[data-ing-delete]').forEach(b=>b.onclick=()=>{syncDraftFromInputs();ingredientDraft.splice(Number(b.dataset.ingDelete),1);renderIngredients();});wrap.querySelectorAll('[data-ing-up]').forEach(b=>b.onclick=()=>{syncDraftFromInputs();const i=Number(b.dataset.ingUp);if(i>0){[ingredientDraft[i-1],ingredientDraft[i]]=[ingredientDraft[i],ingredientDraft[i-1]];renderIngredients();}});wrap.querySelectorAll('[data-ing-down]').forEach(b=>b.onclick=()=>{syncDraftFromInputs();const i=Number(b.dataset.ingDown);if(i<ingredientDraft.length-1){[ingredientDraft[i+1],ingredientDraft[i]]=[ingredientDraft[i],ingredientDraft[i+1]];renderIngredients();}});wrap.querySelector('#addIngredient').onclick=()=>{syncDraftFromInputs();ingredientDraft.push({name:'',amount:'',unit:''});renderIngredients();setTimeout(()=>wrap.querySelector(`[data-ing-name="${ingredientDraft.length-1}"]`)?.focus(),0);};};
    renderIngredients();
    modal.querySelector('#dCancel').onclick=()=>dialog.close();
    if(editing)modal.querySelector('#dDelete').onclick=async()=>{if(confirm(`„${dish.name}“ wirklich endgültig löschen?`)){try{await this.ws('meal_vote/delete_dish',{dish_id:dish.id});dialog.close();await this.load();}catch(e){alert(e.message||e);}}};
    modal.querySelector('#dSave').onclick=async()=>{syncDraftFromInputs();const pendingCategory=categoryWrap.querySelector('#catInput')?.value?.trim();if(pendingCategory&&!categoryDraft.some(x=>x.toLocaleLowerCase('de-DE')===pendingCategory.toLocaleLowerCase('de-DE')))categoryDraft.push(pendingCategory);const name=modal.querySelector('#dName').value.trim(),categories=categoryDraft.map(x=>x.trim()).filter(Boolean),category=categories[0]||'',recipe=modal.querySelector('#dRecipe').value,image=modal.querySelector('#dImage').value.trim(),ingredients=ingredientDraft.map(i=>({name:(i.name||'').trim(),amount:(i.amount||'').trim(),unit:(i.unit||'').trim()})).filter(i=>i.name);if(!name){alert('Bitte einen Namen eingeben.');return;}try{let id=dish?.id;if(editing)await this.ws('meal_vote/update_dish',{dish_id:id,name,category,categories,recipe,image,active:modal.querySelector('#dActive').checked,ingredients});else{const r=await this.ws('meal_vote/add_dish',{name,category,categories,recipe,image,ingredients});id=r.dish_id;}const file=modal.querySelector('#dFile')?.files?.[0]||null;if(file)await this.uploadImage(id,file);dialog.close();await this.load();}catch(e){alert(e.message||e);}};
    dialog.showModal();setTimeout(()=>modal.querySelector('#dName')?.focus(),0);
  }
  async uploadImage(dishId,file){if(file.size>8*1024*1024)throw new Error('Das Bild darf maximal 8 MB groß sein.');const dataUrl=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(file);});await this.ws('meal_vote/upload_image',{dish_id:dishId,filename:file.name,data_url:dataUrl});}
  esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}getCardSize(){return 7;}
}
if(!customElements.get('meal-vote-card')) customElements.define('meal-vote-card',MealVoteCard);console.info('[meal_vote] UI 0.6.20 loaded');window.customCards=window.customCards||[];window.customCards.push({type:'meal-vote-card',name:'Essenswahl',description:'Familien-Voting für Gerichte'});