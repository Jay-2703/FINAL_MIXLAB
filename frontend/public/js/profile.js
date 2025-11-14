(function(){
  // Read stored user and populate placeholders
  const raw = localStorage.getItem('user');
  let user = null;
  try { user = raw ? JSON.parse(raw) : null; } catch(e) { user = null; }

  const displayName = document.getElementById('displayName');
  const emailEl = document.getElementById('email');

  function getName(u){ 
    if(!u) return null; 
    return u.username || u.name || u.fullname || u.email || 'Account'; 
  }

  const name = getName(user);
  if(displayName) displayName.textContent = name || 'Profile';
  if(emailEl) emailEl.textContent = user && user.email ? user.email : '';

  // Example stats (placeholder)
  document.getElementById('statSessions').textContent = 3;
  document.getElementById('statHours').textContent = 12;
  document.getElementById('statCourses').textContent = 2;

  // Logout button
  const logoutBtn = document.getElementById('profileLogout');
  if(logoutBtn){
    logoutBtn.addEventListener('click', () => {
      if(confirm('Logout from MixLab?')){
        try { 
          localStorage.removeItem('token'); 
          localStorage.removeItem('user'); 
          sessionStorage.clear(); 
        } catch(e){}
        window.location.href = '../login/login.html';
      }
    });
  }
})();
