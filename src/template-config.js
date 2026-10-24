// Compiled configuration is embedded here. No fetch/CDN is needed.
{
 const t=CONFIG.template,name=t.player.stageName,handle=t.accountHandle;
 Object.assign(CONFIG,{userName:name,contactName:'联系人',twitterHandle:handle+'.private',avatar:t.assets.avatar||'',wallpaper:t.assets.wallpaper||'',weather:{place:'首尔',temp:'16°',desc:'局部多云',high:'20°',low:'12°'},events:[],calls:[],chat:[],tweets:[],friends:[],notes:[],photos:[],initialNotifications:[],desktopPages:t.desktopPages,spotify:t.music});
 CONFIG.socialAccounts=Object.fromEntries(['X','Instagram','Threads','TikTok'].map(platform=>[platform,[{name,handle,private:false,followers:'0',bio:t.profileBio,avatar:''},{name,handle:handle+'.private',private:true,followers:'0',bio:'',avatar:''}]]));
 CONFIG.instagram={callerName:'联系人',avatar:'',video:'',selfVideo:'',messages:[]};
 CONFIG.creator.channels=[{id:'mavis',name,handle:'@'+handle,bio:t.profileBio,owned:true},{id:'lumi',name:'我的频道',handle:'@'+handle+'.channel',bio:'',owned:true}];
}
