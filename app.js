async function loadReadings(){
  const container=document.getElementById("readingsContainer");
  const actions=document.getElementById("readingsActions");
  const date=document.getElementById("readingsDate");

  try{
    const res=await fetch("/.netlify/functions/readings");
    const data=await res.json();

    date.innerText=data.dateLabel || "Today";
    container.innerHTML="";

    data.items.forEach(r=>{
      const div=document.createElement("div");
      div.className="reading";
      div.innerHTML=`
        <div class="kind">${r.kind}</div>
        <div class="ref">${r.reference}</div>
        <div class="excerpt">${r.excerpt}</div>
      `;
      container.appendChild(div);
    });

    actions.innerHTML=`<a href="${data.source}" target="_blank">Open full readings on USCCB</a>`;
  }
  catch{
    container.innerHTML="Readings unavailable.";
  }
}

async function loadReflection(){
  const box=document.getElementById("reflectionContainer");
  try{
    const res=await fetch("/content/today.json");
    const data=await res.json();
    box.innerHTML=`<p>${data.body}</p>`;
  }
  catch{
    box.innerHTML="No reflection yet.";
  }
}

loadReadings();
loadReflection();
