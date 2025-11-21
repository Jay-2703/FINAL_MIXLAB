// Mock data
const revenueLabels = [...Array(12)].map((_,i)=>{
  const d = new Date(); d.setDate(d.getDate() - (11-i));
  return d.toLocaleDateString();
});
const revenueData = [12000, 9500, 11000, 16000, 14000, 12500, 13000, 15000, 17000, 13500, 12000, 12850];

const ctx = document.getElementById('revenueChart').getContext('2d');
new Chart(ctx, {
  type: 'line',
  data: {
    labels: revenueLabels,
    datasets: [{
      label: 'Revenue (PHP)',
      data: revenueData,
      fill: true,
      tension: 0.3,
      borderWidth: 2,
      borderColor: 'rgba(99,102,241,1)',
      backgroundColor: 'rgba(99,102,241,0.08)'
    }]
  },
  options: {responsive:true, plugins:{legend:{display:false}}}
});

const lessonCtx = document.getElementById('lessonPie').getContext('2d');
new Chart(lessonCtx, {
  type: 'pie',
  data: {
    labels: ['Recording','Mixing','Mastering','Rehearsal'],
    datasets:[{data:[420,310,180,120]}]
  },
  options:{responsive:true, plugins:{legend:{position:'bottom'}}}
});

// Recent bookings mock
const bookings = [
  {id:'BK-1001', user:'Ana Cruz', lesson:'Piano - Beginner', date:'2025-11-12 10:00', status:'Confirmed', amount:850},
  {id:'BK-1002', user:'Mark Dela', lesson:'Guitar - Intermediate', date:'2025-11-13 14:00', status:'Completed', amount:900},
  {id:'BK-1003', user:'Leah Santos', lesson:'Piano - Intermediate', date:'2025-11-14 09:00', status:'Canceled', amount:0},
  {id:'BK-1004', user:'Randy Lim', lesson:'Voice - Trial', date:'2025-11-14 16:00', status:'Confirmed', amount:300},
  {id:'BK-1005', user:'Joan Reyes', lesson:'Theory - Basic', date:'2025-11-15 11:00', status:'No-Show', amount:0}
];

const bookingsBody = document.getElementById('bookingsBody');
bookings.forEach(b=>{
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="py-2 font-mono text-xs">${b.id}</td>
    <td class="py-2">${b.user}</td>
    <td class="py-2">${b.lesson}</td>
    <td class="py-2">${b.date}</td>
    <td class="py-2">${b.status}</td>
    <td class="py-2">₱ ${b.amount.toLocaleString()}</td>
  `;
  bookingsBody.appendChild(tr);
});

// Top students mock
const topStudents = [
  {name:'Ana Cruz', xp:2540},
  {name:'Mark Dela', xp:2110},
  {name:'Leah Santos', xp:1890},
  {name:'Randy Lim', xp:1710}
];
const xpList = document.getElementById('xpList');
topStudents.forEach(s=>{
  const li = document.createElement('li');
  li.className = 'flex justify-between items-center';
  li.innerHTML = `<div><div class="font-medium">${s.name}</div><div class="text-xs text-gray-500">XP: ${s.xp}</div></div><div class="text-sm text-gray-600">Level ${Math.floor(s.xp/1000)+1}</div>`;
  xpList.appendChild(li);
});

// Export handlers
function exportServiceTypesCSV(){
  const headers = ['booking_id','user','lesson','date','status','amount'];
  const rows = bookings.map(b=>[b.id,b.user,b.lesson,b.date,b.status,b.amount]);
  const csv = [headers.join(','), ...rows.map(r=>r.map(c=>`"${(''+c).replace(/"/g,'""')}"`).join(','))].join('\n');
  downloadFile(csv,'bookings.csv','text/csv');
}

function downloadFile(content, filename, mime){
  const blob = new Blob([content], {type: mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

document.getElementById('exportServiceTypes').addEventListener('click', exportServiceTypesCSV);
document.getElementById('exportServiceTypesJson').addEventListener('click', ()=>{
  downloadFile(JSON.stringify(bookings, null, 2), 'bookings.json','application/json');
});

document.getElementById('exportAll').addEventListener('click', ()=>{
  let csv = 'type,metric,value\n';
  csv += `revenue_total,php,128450\n`;
  csv += `bookings_total,pcs,1234\n`;
  csv += `active_users,pcs,842\n`;
  downloadFile(csv,'mixlab_summary.csv','text/csv');
});

// Date range filter
document.getElementById('dateRange').addEventListener('change',(e)=>{
  const val = e.target.value;
  console.log('selected range days:', val);
  document.querySelector('header')?.classList.add('ring','ring-indigo-200');
  setTimeout(()=>document.querySelector('header')?.classList.remove('ring','ring-indigo-200'),300);
});