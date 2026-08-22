class MealVoteCard extends HTMLElement {
  setConfig(config) {
    this.config = config || {};
    this._search = '';
    this._category = 'Alle';
    this._showInactive = false;
    this.attachShadow({mode:'open'});
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this._initialized = true;
      this.load();
    }
  }

  connectedCallback() {
    if (!this._refreshTimer) {
      this._refreshTimer = setInterval(() => {
        if (!this.isConnected || this._loaded || !this._hass) return;
        const openDialog = [...(this.shadowRoot?.querySelectorAll('dialog') || [])].some(d => d.open);
        const active = this.shadowRoot?.activeElement;
        const editing = openDialog || (active && ['INPUT','SELECT','TEXTAREA'].includes(active.tagName));
        if (!editing) this.load();
      }, 600000);
    }
  }

  disconnectedCallback() {
    if (this._refreshTimer) {
      clearInterval(this._refreshTimer);
      this._refreshTimer = null;
    }
  }

  async load() {
    this._loaded = true;
    try {
      this.data = await this._hass.connection.sendMessagePromise({type:'meal_vote/get_data'});
      this.render();
    } catch (e) {
      this.shadowRoot.innerHTML = `<ha-card><div style="padding:16px">Essenswahl konnte nicht geladen werden: ${this.esc(e.message || e)}</div></ha-card>`;
    } finally { this._loaded = false; }
  }

  async call(service, data={}) {
    await this._hass.callService('meal_vote', service, data);
    await this.load();
  }

  async ws(type, data={}) {
    return await this._hass.connection.sendMessagePromise({type, ...data});
  }

  render() {
    const visibleSource = this.data.dishes.filter(d => this._showInactive || d.active !== false);
    const cats = ['Alle', ...new Set(visibleSource.map(d=>d.category).filter(Boolean))];
    let dishes = visibleSource.filter(d => {
      const q = this._search.toLowerCase();
      return (!q || d.name.toLowerCase().includes(q) || (d.category||'').toLowerCase().includes(q) || (d.voters||[]).join(' ').toLowerCase().includes(q)) &&
             (this._category === 'Alle' || d.category === this._category);
    }).sort((a,b) => b.vote_count-a.vote_count || a.name.localeCompare(b.name,'de'));

    const sync = this.data.sync || {};
    const syncText = sync.error ? `⚠ NAS offline – lokaler Stand` : (sync.last_ok ? `✓ Sync ${new Date(sync.last_ok).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}` : 'Noch nicht synchronisiert');

    this.shadowRoot.innerHTML = `
      <style>
        :host{display:block;width:100%;max-width:none} *{box-sizing:border-box} ha-card{padding:16px;width:100%;max-width:none}
        .top{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
        input,select,button{font:inherit;border-radius:12px;border:1px solid var(--divider-color);padding:10px 12px;background:var(--card-background-color);color:var(--primary-text-color)}
        button{cursor:pointer} input{flex:1;min-width:180px}.person{display:flex;align-items:center;gap:6px}
        .status{font-size:.85rem;opacity:.72;margin-bottom:12px}.status.error{color:var(--error-color)}
        .cats{display:flex;gap:8px;overflow:auto;margin-bottom:14px;padding-bottom:2px}.cats button.active{background:var(--primary-color);color:var(--text-primary-color)}
        .grid{width:100%;display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px}.dish{position:relative;border:1px solid var(--divider-color);border-radius:18px;overflow:hidden;background:var(--ha-card-background,var(--card-background-color))}
        .dish.inactive{opacity:.58}.pic{width:100%;height:155px;object-fit:cover;background:var(--secondary-background-color);display:block}.placeholder{display:grid;place-items:center;font-size:42px}
        .body{padding:14px}.nameRow{display:flex;gap:8px;align-items:flex-start}.name{font-size:1.22rem;font-weight:700;flex:1}.edit{padding:6px 9px}.meta{opacity:.75;margin-top:3px}.voters{min-height:26px;margin:10px 0;line-height:1.4}
        .actions{display:flex;gap:8px}.vote{flex:1;font-weight:700}.cooked{white-space:nowrap}.add{margin-left:auto}.toggle{white-space:nowrap}
        .peopleGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-top:14px}.personVote{min-height:58px;font-weight:700;font-size:1.05rem}.personVote.selected{background:var(--primary-color);color:var(--text-primary-color);border-color:var(--primary-color)}
        dialog{border:1px solid var(--divider-color);border-radius:18px;background:var(--card-background-color);color:var(--primary-text-color);width:min(520px,calc(100vw - 24px));padding:0;box-shadow:0 12px 45px rgba(0,0,0,.35)}
        dialog::backdrop{background:rgba(0,0,0,.5)}.modal{padding:18px}.modal h2{margin:0 0 16px}.field{display:flex;flex-direction:column;gap:6px;margin:12px 0}.field input{width:100%}.check{display:flex;gap:8px;align-items:center}.modalActions{display:flex;gap:8px;justify-content:flex-end;margin-top:18px;flex-wrap:wrap}.danger{color:var(--error-color)}
        .preview{width:100%;height:180px;object-fit:cover;border-radius:12px;background:var(--secondary-background-color);margin-top:8px}.hint{font-size:.85rem;opacity:.7}.empty{padding:28px;text-align:center;opacity:.7}
        @media(max-width:600px){ha-card{padding:10px}.pic{height:130px}.actions{flex-direction:column}.add{margin-left:0}.top>*{flex:1 1 auto}.person select{max-width:150px}}
      </style>
      <ha-card>
        <div class="top">
          <input id="search" placeholder="🔎 Gericht, Kategorie oder Person suchen…" value="${this.esc(this._search)}">
          <button id="reload">↻ Sync</button>
          <button id="inactive" class="toggle">${this._showInactive?'Aktive':'Verwaltung'}</button>
          <button id="add" class="add">＋ Gericht</button>
        </div>
        <div class="status ${sync.error?'error':''}">${this.esc(syncText)} · automatisch alle ${sync.interval_minutes||2} Min.</div>
        <div class="cats">${cats.map(c=>`<button data-cat="${this.esc(c)}" class="${c===this._category?'active':''}">${this.esc(c)}</button>`).join('')}</div>
        <div class="grid">${dishes.length ? dishes.map(d=>this.dishHtml(d)).join('') : '<div class="empty">Keine Gerichte gefunden.</div>'}</div>
        <dialog id="dishDialog"><div class="modal" id="dishModal"></div></dialog>
        <dialog id="voteDialog"><div class="modal" id="voteModal"></div></dialog>
      </ha-card>`;

    this.shadowRoot.querySelector('#search').oninput = e => {this._search=e.target.value; this.render();};
    this.shadowRoot.querySelector('#reload').onclick = ()=>this.call('reload');
    this.shadowRoot.querySelector('#add').onclick = ()=>this.openDishDialog();
    this.shadowRoot.querySelector('#inactive').onclick = ()=>{this._showInactive=!this._showInactive; this._category='Alle'; this.render();};
    this.shadowRoot.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{this._category=b.dataset.cat;this.render();});
    this.shadowRoot.querySelectorAll('[data-vote]').forEach(b=>b.onclick=()=>this.openVoteDialog(this.data.dishes.find(d=>d.id===b.dataset.vote)));
    this.shadowRoot.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>this.openDishDialog(this.data.dishes.find(d=>d.id===b.dataset.edit)));
    this.shadowRoot.querySelectorAll('[data-cooked]').forEach(b=>b.onclick=()=>{ if(confirm('Dieses Gericht als gekocht markieren? Nur seine Stimmen werden gelöscht.')) this.call('mark_cooked',{dish_id:b.dataset.cooked}); });
  }

  dishHtml(d) {
    const hist = d.last_cooked ? ` · zuletzt ${new Date(d.last_cooked).toLocaleDateString('de-DE')}` : '';
    const cookedCount = d.times_cooked ? ` · ${d.times_cooked}× gekocht` : '';
    return `<div class="dish ${d.active===false?'inactive':''}">
      ${d.image_url?`<img class="pic" src="${this.esc(d.image_url)}?v=${encodeURIComponent(this.data.sync?.last_ok||'0')}" loading="lazy">`:`<div class="pic placeholder">🍽️</div>`}
      <div class="body"><div class="nameRow"><div class="name">${this.esc(d.name)}${d.active===false?' (inaktiv)':''}</div><button class="edit" data-edit="${this.esc(d.id)}">✎</button></div>
      <div class="meta">${this.esc(d.category||'Ohne Kategorie')} · ${d.vote_count} Stimme${d.vote_count===1?'':'n'}${hist}${cookedCount}</div>
      <div class="voters">${d.voters.length?'👍 '+d.voters.map(x=>this.esc(x)).join(' · '):'Noch keine Stimmen'}</div>
      ${d.active!==false?`<div class="actions"><button class="vote" data-vote="${this.esc(d.id)}">👍 Stimme geben</button><button class="cooked" data-cooked="${this.esc(d.id)}">🍳 Gekocht</button></div>`:''}</div>
    </div>`;
  }

  openVoteDialog(dish) {
    if (!dish) return;
    const dialog = this.shadowRoot.querySelector('#voteDialog');
    const modal = this.shadowRoot.querySelector('#voteModal');
    const voters = new Set(dish.voters || []);
    modal.innerHTML = `
      <h2>Wer stimmt für ${this.esc(dish.name)}?</h2>
      <div class="hint">Bereits gesetzte Stimmen sind markiert. Erneut antippen entfernt die Stimme.</div>
      <div class="peopleGrid">${this.data.people.map(person => `
        <button class="personVote ${voters.has(person)?'selected':''}" data-person="${this.esc(person)}">
          ${voters.has(person)?'✓ ':''}${this.esc(person)}
        </button>`).join('')}</div>
      <div class="modalActions"><button id="vClose">Fertig</button></div>`;
    modal.querySelector('#vClose').onclick = () => dialog.close();
    modal.querySelectorAll('[data-person]').forEach(button => {
      button.onclick = async () => {
        button.disabled = true;
        try {
          await this._hass.callService('meal_vote', 'vote', {dish_id:dish.id, person:button.dataset.person});
          const selected = button.classList.toggle('selected');
          button.textContent = `${selected?'✓ ':''}${button.dataset.person}`;
          const current = new Set(dish.voters || []);
          if (selected) current.add(button.dataset.person); else current.delete(button.dataset.person);
          dish.voters = [...current].sort((a,b)=>a.localeCompare(b,'de'));
          dish.vote_count = dish.voters.length;
        } catch (e) {
          alert(e.message || e);
        } finally {
          button.disabled = false;
        }
      };
    });
    dialog.addEventListener('close', () => this.load(), {once:true});
    dialog.showModal();
  }

  openDishDialog(dish=null) {
    const dialog = this.shadowRoot.querySelector('#dishDialog');
    const modal = this.shadowRoot.querySelector('#dishModal');
    const editing = !!dish;
    modal.innerHTML = `
      <h2>${editing?'Gericht bearbeiten':'Neues Gericht'}</h2>
      <div class="field"><label>Name</label><input id="dName" value="${this.esc(dish?.name||'')}" placeholder="z. B. Lasagne"></div>
      <div class="field"><label>Kategorie</label><input id="dCategory" value="${this.esc(dish?.category||'')}" placeholder="z. B. Pasta"></div>
      <div class="field"><label>Bildpfad auf dem NAS</label><input id="dImage" value="${this.esc(dish?.image||'')}" placeholder="images/lasagne.jpg"><span class="hint">Oder unten direkt ein neues Bild hochladen.</span></div>
      <div class="field"><label>Bild hochladen</label><input id="dFile" type="file" accept="image/jpeg,image/png,image/webp"><span class="hint">Optional, maximal 8 MB.</span>${dish?.image_url?`<img class="preview" src="${this.esc(dish.image_url)}">`:''}</div>
      ${editing?`<label class="check"><input id="dActive" type="checkbox" ${dish.active!==false?'checked':''}> Gericht aktiv und auf dem Voting-Panel anzeigen</label>`:''}
      <div class="modalActions">
        ${editing?'<button id="dDelete" class="danger">Endgültig löschen</button>':''}
        <button id="dCancel">Abbrechen</button><button id="dSave">Speichern</button>
      </div>`;
    modal.querySelector('#dCancel').onclick=()=>dialog.close();
    if (editing) modal.querySelector('#dDelete').onclick=async()=>{
      if(confirm(`„${dish.name}“ wirklich endgültig löschen? Stimmen und Kochhistorie dieses Gerichts werden ebenfalls gelöscht.`)) {
        try { await this.ws('meal_vote/delete_dish',{dish_id:dish.id}); dialog.close(); await this.load(); } catch(e){ alert(e.message||e); }
      }
    };
    modal.querySelector('#dSave').onclick=async()=>{
      const name=modal.querySelector('#dName').value.trim();
      const category=modal.querySelector('#dCategory').value.trim();
      const image=modal.querySelector('#dImage').value.trim();
      if(!name){alert('Bitte einen Namen eingeben.');return;}
      try {
        let id = dish?.id;
        if(editing) {
          await this.ws('meal_vote/update_dish',{dish_id:id,name,category,image,active:modal.querySelector('#dActive').checked});
        } else {
          const r=await this.ws('meal_vote/add_dish',{name,category,image}); id=r.dish_id;
        }
        const file = modal.querySelector('#dFile')?.files?.[0] || null;
        if(file) await this.uploadImage(id,file);
        dialog.close();
        await this.load();
      } catch(e){ alert(e.message||e); }
    };
    dialog.showModal();
    setTimeout(()=>modal.querySelector('#dName')?.focus(),0);
  }

  async uploadImage(dishId,file) {
    if(file.size > 8*1024*1024) throw new Error('Das Bild darf maximal 8 MB groß sein.');
    const dataUrl = await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(file);});
    await this.ws('meal_vote/upload_image',{dish_id:dishId,filename:file.name,data_url:dataUrl});
  }

  esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  getCardSize(){return 7;}
}
customElements.define('meal-vote-card', MealVoteCard);
window.customCards = window.customCards || [];
window.customCards.push({type:'meal-vote-card',name:'Essenswahl',description:'Familien-Voting für Gerichte'});
