var savedPages = [];
let fuse;
let editIndex = null;

fetch('savedPages.json')
  .then(res => res.json())
  .then(data => { if (Array.isArray(data)) { savedPages = data; savePages(); } refreshFuse(); })
  .catch(() => { savedPages = JSON.parse(localStorage.getItem("savedPages") || "[]"); refreshFuse(); });

function savePages() { localStorage.setItem("savedPages", JSON.stringify(savedPages)); refreshFuse(); }
function addPage(p) { savedPages.unshift({ ...p, createdAt: new Date().toISOString() }); savePages(); }
function refreshFuse() { fuse = new Fuse(savedPages, { keys: ["title","url","description"], threshold: 0.3, includeMatches:true }); }

function showSuccess(m){let e=document.getElementById("successMessage"); e.textContent=m; e.style.display="block"; setTimeout(()=>e.style.display="none",3000);}
function showError(m){let e=document.getElementById("errorMessage"); e.textContent=m; e.style.display="block"; setTimeout(()=>e.style.display="none",3000);}

const searchInput=document.getElementById("searchInput");
const searchResults=document.getElementById("searchResults");
const pagesButton=document.getElementById("pagesButton");
const darkModeToggle=document.getElementById("darkModeToggle");
const exportButton=document.getElementById("exportButton");
const importButton=document.getElementById("importButton");
const importFile=document.getElementById("importFile");

const pagesModal=document.getElementById("pagesModal");
const closeModal=document.getElementById("closeModal");
const cancelBtn=document.getElementById("cancelBtn");
const pageForm=document.getElementById("pageForm");
const editSearch=document.getElementById("editSearch");

// Modal
pagesButton.addEventListener("click",()=>{
  pagesModal.style.display="flex";
  pageForm.reset();
  editIndex = null;
});
closeModal.addEventListener("click",()=>pagesModal.style.display="none");
cancelBtn.addEventListener("click",()=>pagesModal.style.display="none");

// Search results
searchInput.addEventListener("input",()=>{
  const q=searchInput.value.trim();
  if(!q){ searchResults.style.display="none"; return; }
  renderResults(fuse.search(q).slice(0,10));
});

function renderResults(results){
  searchResults.innerHTML="";
  if(!results.length) { searchResults.innerHTML = `<div class="result-item">No results</div>`; return; }
  results.forEach(res=>{
    const item=res.item;
    const personal=item.isPersonal ? `<span class="personal-label">[Personal]</span>` : "";
    const div=document.createElement("div");
    div.className="result-item";
    div.innerHTML=`
      <div class="result-header">
        <div class="result-title">${item.title} ${personal}</div>
        <button class="delete-btn">Delete</button>
      </div>
      <div class="result-url">${item.url || "No URL"}</div>
    `;
    div.addEventListener("click", (e) => {
      if(e.target.classList.contains("delete-btn")) return;
      if(item.url) window.open(item.url, "_blank");
      else showError("No URL for this entry");
    });
    div.querySelector(".delete-btn").addEventListener("click",()=>{
      if(confirm(`Delete "${item.title}"?`)){
        savedPages=savedPages.filter(p=>p.title!==item.title);
        savePages();
        showSuccess(`Deleted "${item.title}"`);
        renderResults(fuse.search(searchInput.value.trim()).slice(0,10));
      }
    });
    searchResults.appendChild(div);
  });
  searchResults.style.display="block";
}

// Edit search in modal
editSearch.addEventListener("input", e=>{
  const query = e.target.value.trim().toLowerCase();
  if(!query){ pageForm.reset(); editIndex=null; return; }
  const foundIndex = savedPages.findIndex(p=>p.title.toLowerCase()===query);
  if(foundIndex>=0){
    const p=savedPages[foundIndex];
    document.getElementById("title").value=p.title;
    document.getElementById("url").value=p.url;
    document.getElementById("description").value=p.description;
    document.getElementById("isPersonal").checked=!!p.isPersonal;
    editIndex = foundIndex;
  }
});

// Save / Update Page
pageForm.addEventListener("submit",e=>{
  e.preventDefault();
  const title=document.getElementById("title").value.trim();
  const url=document.getElementById("url").value.trim();
  const description=document.getElementById("description").value.trim();
  const isPersonal=document.getElementById("isPersonal").checked;
  if(!title) return showError("Title required");

  if(editIndex !== null){
    savedPages[editIndex] = { ...savedPages[editIndex], title, url, description, isPersonal };
    showSuccess(`Updated page "${title}"`);
  } else {
    addPage({title,url,description,isPersonal});
    showSuccess(`Page "${title}" added`);
  }
  savePages();
  pagesModal.style.display="none";
});

// Export/Import
exportButton.addEventListener("click",()=>{
  const jsonData=JSON.stringify(savedPages,null,2);
  const blob=new Blob([jsonData],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download="savedPages.json"; a.click();
  URL.revokeObjectURL(url);
});
importButton.addEventListener("click",()=>importFile.click());
importFile.addEventListener("change",e=>{
  const file=e.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=ev=>{
    try{
      const imported=JSON.parse(ev.target.result);
      if(Array.isArray(imported)){ savedPages=imported; savePages(); showSuccess("Pages imported"); }
      else showError("Invalid file format");
    } catch { showError("Failed to parse file"); }
  };
  reader.readAsText(file);
});

darkModeToggle.addEventListener("click",()=>{
  document.body.classList.toggle("dark-mode");
  localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
});
if(localStorage.getItem("darkMode")==="true") document.body.classList.add("dark-mode");
