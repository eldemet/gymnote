// 1️⃣ Set up Dexie DB
const db = new Dexie("GymTrackerDB");
db.version(1).stores({
  machines: "++id, label, image",
  entries:  "++id, machineId, date, weight, reps, sets"
});

// 2️⃣ Grab our UI elements
const machineListEl = document.getElementById("machineList");
const detailEl      = document.getElementById("machineDetail");
const addMachineBtn = document.getElementById("addMachineBtn");

let selectedMachineId = null;

// 3️⃣ Add new machine (label + photo)
addMachineBtn.addEventListener("click", () => {
  const label = prompt("Machine name:");
  if (!label) return;

  // file picker for image
  const input = document.createElement("input");
  input.type = "file"; input.accept = "image/*";
  input.onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async () => {
      await db.machines.add({ label, image: reader.result });
      loadMachines();
    };
    reader.readAsDataURL(file);
  };
  input.click();
});

// 4️⃣ Load & render machine list
async function loadMachines() {
  const machines = await db.machines.toArray();
  machineListEl.innerHTML = "";
  machines.forEach(m => {
    const li = document.createElement("li");
    li.className = "cursor-pointer p-2 hover:bg-gray-100 flex items-center space-x-2";
    li.innerHTML = `
      <img src="${m.image}" class="w-12 h-12 rounded object-cover"/>
      <span>${m.label}</span>
    `;
    li.onclick = () => selectMachine(m.id);
    machineListEl.appendChild(li);
  });
}

// 5️⃣ Select a machine → show details, “Add Entry” & chart
async function selectMachine(id) {
  selectedMachineId = id;
  const m = await db.machines.get(id);

  detailEl.innerHTML = `
    <h2 class="text-2xl font-semibold mb-2">${m.label}</h2>
    <img src="${m.image}"
         class="w-full h-48 object-cover rounded mb-4"/>
    <button id="addEntryBtn"
            class="mb-4 px-3 py-1 bg-green-500 text-white rounded">
      + Add Entry
    </button>
    <canvas id="progressChart" height="200"></canvas>
  `;

  document.getElementById("addEntryBtn").onclick = showEntryForm;
  await renderChart();
}

// 6️⃣ Prompt for a new workout entry
async function showEntryForm() {
  const today = new Date().toISOString().slice(0,10);
  const date   = prompt("Date (YYYY-MM-DD):", today);
  const weight = prompt("Weight:");
  const reps   = prompt("Reps:");
  const sets   = prompt("Sets:");
  if (!date||!weight||!reps||!sets) return;

  await db.entries.add({
    machineId: selectedMachineId,
    date,
    weight: Number(weight),
    reps:   Number(reps),
    sets:   Number(sets)
  });
  selectMachine(selectedMachineId);
}

// 7️⃣ Draw the Chart.js line chart
async function renderChart() {
  const entries = await db.entries
    .where("machineId").equals(selectedMachineId)
    .sortBy("date");

  const dates  = entries.map(e=>e.date);
  const weights= entries.map(e=>e.weight);
  const reps   = entries.map(e=>e.reps);

  const ctx = document.getElementById("progressChart").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: dates,
      datasets: [
        { label: "Weight", data: weights, borderWidth: 2 },
        { label: "Reps",   data: reps,    borderWidth: 2 }
      ]
    },
    options: {
      scales: {
        x: { title: { display: true, text: "Date" } }
      }
    }
  });
}

// 8️⃣ Initial load
loadMachines();
