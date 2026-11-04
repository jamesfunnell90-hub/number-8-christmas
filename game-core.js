/* Santa Shortlist: the game's state machine. Shared by the host phone (remote) and the TV page.
   It only knows the SHAPE of the game (how many rounds and spares), never the questions, names or results,
   so the remote can drive the TV without the host seeing what is coming.
   state fields: mode, screen, ret, k ('r' round | 's' spare | 'f' flip round), i, n, sp (spares used), swap {n: spareIndex},
   sd (sudden death), flipResult, coinSeq, flips, flipped, champion, cdSeq, revSeq, paused, muted, seq */
(function(root){
  const GC={};
  GC.init=mode=>({mode:mode||'real',screen:'idle',ret:'',k:'r',i:0,n:0,sp:0,swap:{},sd:false,flipResult:'',coinSeq:0,flips:0,flipped:false,champion:'',cdSeq:0,revSeq:0,paused:false,muted:false,seq:0});
  const coin=()=>Math.random()<.5?'heads':'tails';
  function advance(s,info){                       // after a round: the next question, sudden death, or coin flips
    if(!s.sd&&s.n<info.rounds){s.n++;s.k='r';s.i=s.n-1;s.screen='question';return s}
    s.sd=true;
    if(s.sp<info.spares){s.k='s';s.i=s.sp;s.sp++;s.screen='question';return s}
    s.k='f';s.flips++;s.flipResult=coin();s.coinSeq++;s.screen='flipround';return s;
  }
  GC.step=function(st,cmd,info,arg){
    const s=JSON.parse(JSON.stringify(st));s.swap=s.swap||{};s.seq=(st.seq||0)+1;
    const sc=s.screen;
    switch(cmd){
      case 'next':
        if(sc==='idle')s.screen='title';
        else if(sc==='title')s.screen='howto';
        else if(sc==='howto'){if(s.ret){s.screen=s.ret;s.ret=''}else s.screen='practice'}
        else if(sc==='practice'){if(!s.flipped){s.flipped=true;s.flipResult=coin();s.coinSeq++}else{s.n=1;s.k='r';s.i=0;s.sd=false;s.screen='question'}}
        else if(sc==='coin'){s.screen=s.ret||'question';s.ret=''}
        else if(sc==='question')s.screen='faces';
        else if(sc==='faces'){s.screen='countdown';s.cdSeq++;s.paused=false}
        else if(sc==='countdown'){s.screen='reveal';s.revSeq++}
        else if(sc==='reveal')s.screen='out';
        else if(sc==='out'||sc==='everywrong')return advance(s,info);
        else if(sc==='flipround'){s.flips++;s.flipResult=coin();s.coinSeq++}
        else if(sc==='champion')s.screen=info.noResults?'idle':'results';
        else if(sc==='results'||sc==='pick'){s.screen='idle'}
        break;
      case 'back':
        if(sc==='title')s.screen='idle';
        else if(sc==='howto'){if(s.ret){s.screen=s.ret;s.ret=''}else s.screen='title'}
        else if(sc==='practice')s.screen='howto';
        else if(sc==='faces')s.screen='question';
        else if(sc==='countdown')s.screen='faces';
        else if(sc==='reveal')s.screen='countdown';
        else if(sc==='out'||sc==='everywrong')s.screen='reveal';
        else if(sc==='question'&&s.k==='r'&&s.n>1&&!s.sd){s.n--;s.i=s.n-1;s.screen='out'}
        else if(sc==='results')s.screen='champion';
        else if(sc==='coin'){s.screen=s.ret||'question';s.ret=''}
        break;
      case 'pause':s.paused=!s.paused;break;
      case 'mute':s.muted=!s.muted;break;
      case 'skip':
        if(['question','faces','countdown','reveal','out'].includes(sc)&&s.sp<info.spares){
          if(s.k==='r'&&!s.sd)s.swap[s.n]=s.sp;else{s.k='s';s.i=s.sp}
          s.sp++;s.screen='question';s.paused=false;
        }
        break;
      case 'everywrong':if(['reveal','out'].includes(sc))s.screen='everywrong';break;
      case 'suddendeath':{s.sd=true;if(s.sp<info.spares){s.k='s';s.i=s.sp;s.sp++;s.screen='question'}else{s.k='f';s.flips++;s.flipResult=coin();s.coinSeq++;s.screen='flipround'}s.paused=false;break}
      case 'flip':s.ret=sc;s.screen='coin';s.flipResult=coin();s.coinSeq++;break;
      case 'rules':s.ret=sc;s.screen='howto';break;
      case 'winner':s.ret='';s.screen='pick';break;
      case 'pick':s.champion=arg||'';s.screen='champion';break;
      case 'exit':s.screen='idle';s.paused=false;break;
      default:return st;
    }
    return s;
  };
  /* plain-English label for the big button on the remote (describes the action, not what is coming) */
  GC.nextLabel=function(st){
    const m={idle:'Start the game',title:'How to play',howto:st.ret?'Back to the game':'Practice flip',practice:st.flipped?'Start round 1':'Flip the coin',coin:'Back to the game',question:'Show the faces',faces:'Start the countdown',countdown:'Reveal the votes',reveal:'Wrong guessers are out',out:'Next round',everywrong:'Next round',flipround:'Flip again',champion:'Full results',results:'Finish',pick:'Finish'};
    return m[st.screen]||'Next';
  };
  GC.screenName=function(st){
    const m={idle:'Waiting screen',title:'Title',howto:'How to play',practice:'Practice flip',coin:'Coin flip',question:'The question',faces:'The two faces',countdown:'Countdown',reveal:'The reveal',out:'Wrong? You are out',everywrong:'Everyone was wrong',flipround:'Sudden death flip',pick:'Choosing the champion',champion:'Champion',results:'Full results'};
    return m[st.screen]||st.screen;
  };
  /* which item the TV shows now: {kind:'r'|'s'|'f', index} resolved to a real round object by the TV */
  GC.item=function(st,data){
    if(st.k==='f')return null;
    if(st.k==='r'&&!st.sd){const sw=st.swap&&st.swap[st.n];return sw!==undefined?data.spares[sw]:data.rounds[st.n-1]}
    return data.spares[st.i];
  };
  if(typeof module!=='undefined')module.exports=GC;else root.GC=GC;
})(typeof window!=='undefined'?window:this);
