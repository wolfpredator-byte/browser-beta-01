'use strict';
/**
 * Beta 0.30: compila VARCO per Android (mobile/) e copia l'APK in dist/VARCO-Android-<versione>.apk.
 * Serve Android Studio installato: uso il suo SDK e, se JAVA_HOME manca, il Java che porta con sé.
 */
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const mobile=path.join(root,'mobile');
const gradle=fs.readFileSync(path.join(mobile,'app','build.gradle.kts'),'utf8');
const version=(/versionName\s*=\s*"([^"]+)"/.exec(gradle)||[])[1];
if(!version)throw new Error('versionName non trovato in mobile/app/build.gradle.kts');

const env={...process.env};
if(!env.JAVA_HOME){
  const studioJbr='C:\\Program Files\\Android\\Android Studio\\jbr';
  if(fs.existsSync(studioJbr))env.JAVA_HOME=studioJbr;
}
const sdk=env.ANDROID_HOME||path.join(env.LOCALAPPDATA||'','Android','Sdk');
const local=path.join(mobile,'local.properties');
if(!fs.existsSync(local))fs.writeFileSync(local,`sdk.dir=${sdk.replace(/\\/g,'\\\\').replace(':','\\:')}\n`);

const wrapper=path.join(mobile,process.platform==='win32'?'gradlew.bat':'gradlew');
execFileSync(wrapper,['testDebugUnitTest','assembleDebug','--console=plain'],{cwd:mobile,env,stdio:'inherit',shell:process.platform==='win32'?true:false});

const apk=path.join(mobile,'app','build','outputs','apk','debug','app-debug.apk');
const out=path.join(root,'dist',`VARCO-Android-${version}.apk`);
fs.mkdirSync(path.dirname(out),{recursive:true});
for(const f of fs.readdirSync(path.dirname(out)))if(/^VARCO-Android-.*\.apk$/.test(f))fs.rmSync(path.join(path.dirname(out),f));
fs.copyFileSync(apk,out);
console.log(`APK pronto: ${path.relative(root,out)} (${(fs.statSync(out).size/1048576).toFixed(1)} MB)`);
