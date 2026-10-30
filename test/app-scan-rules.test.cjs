'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {pickMainExe,steamLibraries,steamApp,epicApp,usefulShortcut,mergeResults,normalizeFolders}=require('../lib/app-scan-rules.cjs');

test('eseguibile principale: il nome della cartella vince, installer e crash reporter mai', ()=>{
  assert.equal(pickMainExe('Destiny 2',[
    {rel:'destiny2launcher.exe',size:2e6},{rel:'destiny2.exe',size:9e7},{rel:'bin\\x64\\CrashReportClient.exe',size:3e7},
    {rel:'unins000.exe',size:3e6},{rel:'EasyAntiCheat\\EasyAntiCheat_EOS_Setup.exe',size:9e6}]),'destiny2.exe');
  assert.equal(pickMainExe('Hollow Knight',[{rel:'UnityCrashHandler64.exe',size:1e6},{rel:'hollow_knight.exe',size:6e5}]),'hollow_knight.exe');
  // Unreal: lo stub in cima e il gioco vero in Binaries\Win64.
  assert.equal(pickMainExe('Satisfactory',[{rel:'FactoryGame.exe',size:3e5},
    {rel:'FactoryGame\\Binaries\\Win64\\FactoryGame-Win64-Shipping.exe',size:2e8}]),'FactoryGame\\Binaries\\Win64\\FactoryGame-Win64-Shipping.exe');
  assert.equal(pickMainExe('Gioco',[{rel:'setup.exe',size:1e7},{rel:'vc_redist.x64.exe',size:2e7},{rel:'readme.txt',size:1}]),null);
  assert.equal(pickMainExe('',[{rel:'tetris.exe',size:1}]),'tetris.exe');
});

test('Steam: librerie (formato nuovo e vecchio) e manifest dei giochi', ()=>{
  const vdf=`"libraryfolders"\n{\n\t"0"\n\t{\n\t\t"path"\t\t"C:\\\\Program Files (x86)\\\\Steam"\n\t\t"apps"\n\t\t{\n\t\t\t"1085660"\t\t"123"\n\t\t}\n\t}\n\t"1"\n\t{\n\t\t"path"\t\t"D:\\\\SteamLibrary"\n\t}\n}`;
  assert.deepEqual(steamLibraries(vdf),['C:\\Program Files (x86)\\Steam','D:\\SteamLibrary']);
  assert.deepEqual(steamLibraries('"LibraryFolders"{"TimeNextStatsReport" "1" "1" "E:\\\\Giochi"}'),['E:\\Giochi']);
  assert.deepEqual(steamApp('"AppState"{"appid" "1085660" "name" "Destiny 2" "installdir" "Destiny 2"}'),{name:'Destiny 2',installdir:'Destiny 2'});
  assert.equal(steamApp('"AppState"{"name" "Steamworks Common Redistributables" "installdir" "Steamworks Shared"}'),null);
  assert.equal(steamApp('rotto'),null);
});

test('Epic, menu Start, elenco finale e cartelle', ()=>{
  assert.deepEqual(epicApp(JSON.stringify({DisplayName:'Fortnite',InstallLocation:'C:\\Epic\\Fortnite',LaunchExecutable:'FortniteGame/Binaries/Win64/FortniteLauncher.exe',AppCategories:['public','games']})),
    {name:'Fortnite',folder:'C:\\Epic\\Fortnite',exe:'FortniteGame/Binaries/Win64/FortniteLauncher.exe'});
  assert.equal(epicApp(JSON.stringify({DisplayName:'Unreal Engine',InstallLocation:'C:\\UE',LaunchExecutable:'x.exe',AppCategories:['engines']})),null);
  assert.equal(epicApp('{'),null);
  assert.equal(usefulShortcut('Blender','C:\\Program Files\\Blender\\blender.exe'),true);
  assert.equal(usefulShortcut('Disinstalla Blender','C:\\Program Files\\Blender\\uninstall.exe'),false);
  assert.equal(usefulShortcut('Sito web','https://x.it'),false);
  assert.equal(usefulShortcut('Command Prompt','C:\\WINDOWS\\system32\\cmd.exe'),false);
  assert.equal(usefulShortcut('EA app Updater','C:\\EA\\EAUpdater.exe'),false);
  const merged=mergeResults([[{name:'zeta',path:'C:\\a.exe'}],[{name:'Alfa',path:'c:\\A.EXE'},{name:'beta',path:'C:\\b.exe'}]]);
  assert.deepEqual(merged.map(x=>x.name),['beta','zeta']);
  assert.deepEqual(normalizeFolders(['C:\\Giochi','c:\\giochi','relativa',42,'\\\\nas\\giochi','D:/App']),['C:\\Giochi','\\\\nas\\giochi','D:/App']);
});
