document.onkeydown = function(e) {
	if(e.key == "F12") return false;
	if(e.ctrlKey && e.shiftKey && e.key == 'I') return false;
	if(e.ctrlKey && e.shiftKey && e.key == 'C') return false;
	if(e.ctrlKey && e.shiftKey && e.key == 'J') return false;
	if(e.ctrlKey && (e.key == 'u' || e.key == 'U')) return false;
}

document.addEventListener('contextmenu', e => e.preventDefault());

const {appWindow} = window.__TAURI__.window;

document.addEventListener('keydown', async (e) => {
  e.preventDefault();
  if (e.key === "F11") {
    console.log(await appWindow.isFullscreen());
    await appWindow.setFullscreen(!(await appWindow.isFullscreen()));
  }
});