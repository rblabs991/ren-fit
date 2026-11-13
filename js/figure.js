/* Ren Fit — 3D coach: rig, inverse kinematics, and one pose function per move.
   Units are metres. The figure faces +Z; its left side is +X. */
(function(){
"use strict";
const RF=window.RF=window.RF||{};
const D=Math.PI/180,TAU=Math.PI*2,Z3=[0,0,0];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const sm=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
const osc=ph=>(1-Math.cos(TAU*ph))/2;
/* rise – hold – return, hold fraction k */
const holdC=(ph,k=.3)=>{const r=(1-k)/2;if(ph<r)return sm(ph/r);if(ph<r+k)return 1;return sm(1-(ph-r-k)/r)};
const phase3=(k,a,b,c)=>ph=>{const r=(1-k)/2;return ph<r?a:ph<r+k?b:c};
RF.util={clamp,sm,osc,holdC,D,TAU};

/* ---------- pose helpers ---------- */
function base(){return{root:{p:[0,.955,0],r:[0,0,0]},
  j:{lSh:[0,0,7*D],rSh:[0,0,-7*D],lEl:[-12*D,0,0],rEl:[-12*D,0,0]},
  ik:{lF:{t:[.11,.08,0],pole:[.15,0,1]},rF:{t:[-.11,.08,0],pole:[-.15,0,1]}},ribs:1,props:{}}}
function hipHand(P,side){const[x,y,z]=P.root.p;
  if(side>=0)P.ik.lH={t:[x+.168,y+.05,z+.01],pole:[1,-.1,-.9]};
  if(side<=0)P.ik.rH={t:[x-.168,y+.05,z+.01],pole:[-1,-.1,-.9]}}
const handsOnHips=P=>hipHand(P,0);
const rotY=(v,a)=>[v[0]*Math.cos(a)+v[2]*Math.sin(a),v[1],-v[0]*Math.sin(a)+v[2]*Math.cos(a)];
const FLAT=[-Math.PI/2,0,0];           /* hand flat, fingers forward */
const UPHAND=[0,0,Math.PI];            /* hand flat on a wall, fingers up */
/* keep the shoulders at a fixed height in all-fours poses */
const quadFix=J=>{for(let i=0;i<3;i++){J.root.updateMatrixWorld(true);const y=new THREE.Vector3().setFromMatrixPosition(J.lSh.matrixWorld).y;J.root.rotation.x+=(y-.565)/.48}};

/* ---------- the moves ---------- */
const M=RF.MOVES={
march:{p:1.3,kind:'flow',hl:['lTh','rTh','abs'],cam:[26,9,3.5,.95,0],
 pose(ph){const P=base(),a=Math.sin(TAU*ph),l=Math.max(0,a),r=Math.max(0,-a);
  P.root.p[1]=.955-.012*(l+r);P.root.p[0]=.015*(r-l);
  P.ik.lF={t:[.11,.08+.3*l,.1*l],pole:[.15,0,1],rot:[.35*l,0,0]};
  P.ik.rF={t:[-.11,.08+.3*r,.1*r],pole:[-.15,0,1],rot:[.35*r,0,0]};
  P.j.lSh=[(-34*r+20*l)*D,0,7*D];P.j.rSh=[(-34*l+20*r)*D,0,-7*D];
  P.j.lEl=[-(60+18*r)*D,0,0];P.j.rEl=[-(60+18*l)*D,0,0];P.j.chest=[0,(r-l)*5*D,0];return P}},

stepjacks:{p:2.2,kind:'flow',hl:['lTh','rTh','lUA','rUA'],cam:[12,8,3.9,1.02,0],
 pose(ph){const P=base(),left=ph<.5,u=(ph*2)%1,k=sm(Math.sin(Math.PI*u)),S=left?1:-1,arc=.05*Math.sin(Math.PI*k);
  const step={t:[S*(.11+.3*k),.08+arc,0],pole:[S*.2,0,1],rot:[0,S*.15*k,0]};
  if(left)P.ik.lF=step;else P.ik.rF=step;
  P.root.p=[S*.12*k,.955-.03*k,0];
  P.j.lSh=[0,0,(10+148*k)*D];P.j.rSh=[0,0,-(10+148*k)*D];P.j.lEl=[-(10+8*k)*D,0,0];P.j.rEl=[-(10+8*k)*D,0,0];return P}},

shoulders:{p:2.6,kind:'flow',sides:true,hl:['lUA','rUA','neck','chest'],cam:[40,8,2.0,1.36,0],
 pose(ph,S){const P=base(),a=TAU*ph*S,o=[0,.055*Math.sin(a),.04*Math.cos(a)];
  P.j.lClavP=o;P.j.rClavP=o.slice();P.j.lSh=[10*D*Math.cos(a),0,6*D];P.j.rSh=[10*D*Math.cos(a),0,-6*D];
  P.j.lEl=[-8*D,0,0];P.j.rEl=[-8*D,0,0];P.j.chest=[-2*D*Math.sin(a),0,0];return P}},

armcircles:{p:2.2,kind:'flow',sides:true,hl:['lUA','rUA','chest'],cam:[18,8,3.2,1.25,0],
 pose(ph,S){const P=base(),a=TAU*ph*S,c=22*D;
  P.j.lSh=[0,c*Math.cos(a),90*D+c*Math.sin(a)];P.j.rSh=[0,-c*Math.cos(a),-(90*D+c*Math.sin(a))];
  P.j.lEl=[-4*D,0,0];P.j.rEl=[-4*D,0,0];return P}},

neck:{p:5,kind:'flow',hl:['neck'],cam:[8,4,1.6,1.5,0],
 pose(ph){const P=base(),v=Math.sin(TAU*ph),k=Math.sign(v)*Math.pow(Math.abs(v),.55);
  P.j.neck=[0,0,-13*D*k];P.j.head=[0,0,-22*D*k];P.j.lSh=[0,0,4*D];P.j.rSh=[0,0,-4*D];return P}},

twists:{p:2.6,kind:'flow',hl:['abs','chest'],cam:[14,12,3.1,1.05,0],
 pose(ph){const P=base(),a=Math.sin(TAU*ph);
  P.j.spine=[0,a*22*D,0];P.j.chest=[0,a*24*D,0];P.j.neck=[0,-a*12*D,0];
  P.j.lSh=[-22*D,0,24*D];P.j.rSh=[-22*D,0,-24*D];P.j.lEl=[-100*D,0,0];P.j.rEl=[-100*D,0,0];
  P.ik.lF.t=[.14,.08,0];P.ik.rF.t=[-.14,.08,0];return P}},

sidereach:{p:5,kind:'hold',sides:true,hl:['abs','chest','UA:S'],cam:[6,8,3.4,1.1,0],
 pose(ph,S){const P=base(),s=osc(ph),b=(7+13*s)*D;
  P.root.p=[S*.035*s,.955,0];P.j.spine=[0,0,S*b*.5];P.j.chest=[0,0,S*b*.5];P.j.neck=[0,0,S*3*D];
  P.ik.lF.t=[.15,.08,0];P.ik.rF.t=[-.15,.08,0];
  if(S>0){P.j.lSh=[0,0,170*D];P.j.lEl=[-14*D,0,0]}else{P.j.rSh=[0,0,-170*D];P.j.rEl=[-14*D,0,0]}
  hipHand(P,-S);return P}},

hips:{p:3.5,kind:'flow',sides:true,hl:['pelvis','abs'],cam:[20,16,2.9,.95,0],
 pose(ph,S){const P=base(),a=TAU*ph*S,c=Math.cos(a),s=Math.sin(a);
  P.root.p=[.065*c,.94,.05*s];P.root.r=[-s*6*D,0,c*6*D];P.j.spine=[s*7*D,0,-c*8*D];P.j.chest=[0,0,-c*2*D];
  P.ik.lF.t=[.13,.08,0];P.ik.rF.t=[-.13,.08,0];handsOnHips(P);return P}},

squat:{p:3.6,kind:'reps',hl:['lTh','rTh','pelvis'],cam:[62,10,3.4,.8,-.05],phase:phase3(.12,'down','hold','up'),
 pose(ph){const P=base(),s=holdC(ph,.12);
  P.ik.lF={t:[.15,.08,0],pole:[.3,0,1],rot:[0,.2,0]};P.ik.rF={t:[-.15,.08,0],pole:[-.3,0,1],rot:[0,-.2,0]};
  P.root.p=[0,.955-.36*s,-.24*s];P.root.r=[28*D*s,0,0];P.j.spine=[-4*D*s,0,0];P.j.neck=[-14*D*s,0,0];
  P.j.lSh=[-(15+103*s)*D,0,6*D];P.j.rSh=[-(15+103*s)*D,0,-6*D];P.j.lEl=[-6*D,0,0];P.j.rEl=[-6*D,0,0];return P}},

wallsit:{p:6,kind:'hold',hl:['lTh','rTh','pelvis'],cam:[64,10,3.2,.72,.15],
 pose(ph){const P=base(),s=osc(ph);
  P.root.p=[0,.535,0];P.ribs=1+.035*s;
  P.ik.lF={t:[.12,.08,.44],pole:[.1,1,.6]};P.ik.rF={t:[-.12,.08,.44],pole:[-.1,1,.6]};
  P.ik.lH={t:[.13,.615,.27],pole:[1,.2,-.6],rot:FLAT};P.ik.rH={t:[-.13,.615,.27],pole:[-1,.2,-.6],rot:FLAT};
  P.props={wallZ:[-.128,-1]};return P}},

wallpush:{p:3,kind:'reps',hl:['chest','lUA','rUA','lFA','rFA'],cam:[98,10,3.9,.92,.4],phase:phase3(.1,'down','hold','push'),
 pose(ph){const P=base(),s=holdC(ph,.1),al=(15+15*s)*D,L=.88;
  P.root.p=[0,.08+L*Math.cos(al),L*Math.sin(al)];P.root.r=[al,0,0];P.j.neck=[-4*D,0,0];
  P.ik.lH={t:[.24,1.32,.86],pole:[1,-.6,-.5],rot:UPHAND};P.ik.rH={t:[-.24,1.32,.86],pole:[-1,-.6,-.5],rot:UPHAND};
  P.props={wallZ:[.905,1]};return P}},

incline:{p:3.4,kind:'reps',hl:['chest','lUA','rUA','abs'],cam:[74,10,4.3,.62,.85],phase:phase3(.1,'down','hold','push'),
 pose(ph){const P=base(),s=holdC(ph,.1),al=(58+8*s)*D,L=.88;
  P.root.p=[0,.13+L*Math.cos(al),L*Math.sin(al)];P.root.r=[al,0,0];P.j.neck=[-16*D,0,0];
  P.ik.lF={t:[.1,.13,0],pole:[.1,-1,.4],rot:[38*D,0,0]};P.ik.rF={t:[-.1,.13,0],pole:[-.1,-1,.4],rot:[38*D,0,0]};
  P.ik.lH={t:[.23,.485,1.55],pole:[.7,-.2,-1],rot:FLAT};P.ik.rH={t:[-.23,.485,1.55],pole:[-.7,-.2,-1],rot:FLAT};
  P.props={bench:[1.72]};return P}},

knee:{p:3.2,kind:'reps',hl:['lTh','rTh','abs'],cam:[32,9,3.1,.95,0],
 pose(ph){const P=base(),left=ph<.5,u=(ph*2)%1,l=Math.pow(Math.sin(Math.PI*u),1.3);
  const y=.08+.42*l,z=.16*l,rot=[.4*l,0,0];
  if(left)P.ik.lF={t:[.11,y,z],pole:[.1,0,1],rot};else P.ik.rF={t:[-.11,y,z],pole:[-.1,0,1],rot};
  P.root.p=[(left?-.035:.035)*l,.955,0];handsOnHips(P);return P}},

lunge:{p:4.4,kind:'reps',hl:['lTh','rTh','pelvis'],cam:[64,10,3.6,.75,-.3],
 phase(ph){const u=(ph*2)%1;return u<.425?'stepback':u<.575?'hold':'up'},
 pose(ph){const P=base(),left=ph<.5,u=(ph*2)%1,l=holdC(u,.15),S=left?1:-1;
  const back={t:[S*.11,.08+.05*l,-.68*l],pole:[S*.05,-.6*l,1],rot:[52*D*l,0,0]};
  if(left){P.ik.lF=back;P.ik.rF={t:[-.11,.08,0],pole:[-.15,0,1]}}else{P.ik.rF=back;P.ik.lF={t:[.11,.08,0],pole:[.15,0,1]}}
  P.root.p=[0,.955-.36*l,-.3*l];P.root.r=[9*D*l,0,0];P.j.neck=[-6*D*l,0,0];handsOnHips(P);return P}},

calfraise:{p:3,kind:'reps',hl:['lCalf','rCalf'],cam:[58,8,3.1,.9,0],phase:phase3(.25,'up','hold','down'),
 pose(ph){const P=base(),s=holdC(ph,.25);
  P.ik.lF={t:[.1,.08+.05*s,.056*s],pole:[.15,0,1],rot:[30*D*s,0,0]};P.ik.rF={t:[-.1,.08+.05*s,.056*s],pole:[-.15,0,1],rot:[30*D*s,0,0]};
  P.root.p=[0,.955+.05*s,.03*s];handsOnHips(P);return P}},

catcow:{p:6,kind:'reps',hl:['chest','abs','neck'],cam:[88,14,2.7,.42,.05],
 phase(ph){return Math.sin(TAU*ph)>=0?'round':'arch'},
 pose(ph){const P=base(),c=Math.sin(TAU*ph),k=Math.sign(c)*Math.pow(Math.abs(c),.7),cat=Math.max(0,k),cow=Math.max(0,-k);
  P.root.p=[0,.49,0];P.root.r=[80*D,0,0];
  P.j.spine=[(-20*cat+14*cow)*D,0,0];P.j.chest=[(14*cat-10*cow)*D,0,0];P.j.neck=[(26*cat-30*cow)*D,0,0];P.j.head=[(10*cat-8*cow)*D,0,0];
  P.ik.lF={t:[.11,.05,-.43],pole:[0,-.2,1],rot:[Math.PI,0,0]};P.ik.rF={t:[-.11,.05,-.43],pole:[0,-.2,1],rot:[Math.PI,0,0]};
  P.ik.lH={t:[.19,.025,.49],pole:[.2,0,-1],rot:FLAT};P.ik.rH={t:[-.19,.025,.49],pole:[-.2,0,-1],rot:FLAT};
  P.fix=quadFix;P.props={mat:[.05]};return P}},

birddog:{p:7,kind:'reps',hl:['abs','pelvis','chest'],cam:[84,14,3.1,.45,.05],
 phase(ph){const u=(ph*2)%1;return u<.325?'reach':u<.675?'hold':'back'},
 pose(ph){const P=base(),left=ph<.5,u=(ph*2)%1,l=holdC(u,.35),S=left?1:-1;
  P.root.p=[0,.49,0];P.root.r=[80*D,0,0];P.j.neck=[-16*D,0,0];
  const hand=x=>({t:[x,.025,.49],pole:[x>0?.2:-.2,0,-1],rot:FLAT});
  const kneel=x=>({t:[x,.05,-.43],pole:[0,-.2,1],rot:[Math.PI,0,0]});
  P.ik.lH=hand(.19);P.ik.rH=hand(-.19);P.ik.lF=kneel(.11);P.ik.rF=kneel(-.11);
  P.ik[S>0?'lH':'rH']={t:[S*.19,.025+.565*l,.49+.52*l],pole:[S*.2,-.6*l,-1],rot:FLAT};
  P.ik[S>0?'rF':'lF']={t:[-S*.11,.05+.46*l,-.43-.43*l],pole:[0,-1,.5-.2*l],rot:[Math.PI*(1-.38*l),0,0]};
  P.fix=quadFix;P.props={mat:[.05]};return P}},

plank:{p:6,kind:'hold',hl:['abs','chest','lUA','rUA'],cam:[86,12,2.9,.3,-.05],
 pose(ph){const P=base(),s=osc(ph);
  P.root.p=[0,.18,-.106];P.root.r=[74.8*D,0,0];P.j.neck=[-14*D,0,0];P.ribs=1+.035*s;
  P.ik.lH={t:[.2,.045,.64],pole:[.2,-1,0],rot:FLAT};P.ik.rH={t:[-.2,.045,.64],pole:[-.2,-1,0],rot:FLAT};
  P.ik.lF={t:[.1,.3,-.9],pole:[0,-1,.2],rot:[Math.PI*.78,0,0]};P.ik.rF={t:[-.1,.3,-.9],pole:[0,-1,.2],rot:[Math.PI*.78,0,0]};
  P.props={mat:[-.1]};return P}},

bridge:{p:3.6,kind:'reps',hl:['pelvis','lTh','rTh'],cam:[88,14,2.8,.3,-.1],phase:phase3(.2,'lift','squeeze','down'),
 pose(ph){const P=base(),b=34*D*holdC(ph,.2);
  P.root.p=[0,.12+.5*Math.sin(b),-.52+.5*Math.cos(b)];P.root.r=[-(90*D+b),0,0];
  P.j.neck=[b*.95,0,0];P.j.lSh=[b,0,10*D];P.j.rSh=[b,0,-10*D];P.j.lEl=[-3*D,0,0];P.j.rEl=[-3*D,0,0];
  P.ik.lF={t:[.12,.08,.36],pole:[0,1,.4]};P.ik.rF={t:[-.12,.08,.36],pole:[0,1,.4]};
  P.props={mat:[-.1]};return P}},

deadbug:{p:7,kind:'reps',hl:['abs','pelvis'],cam:[86,18,2.9,.35,-.1],
 phase(ph){const u=(ph*2)%1;return u<.4?'lower':u<.6?'hold':'back'},
 pose(ph){const P=base(),left=ph<.5,u=(ph*2)%1,l=holdC(u,.2),S=left?1:-1;
  P.root.p=[0,.125,0];P.root.r=[-90*D,0,0];
  const arm=(x,k)=>{const th=84*D*k;return{t:[x,.125+.54*Math.cos(th),-.495-.54*Math.sin(th)],pole:[x>0?1:-1,.2,0]}};
  const leg=(x,k)=>({t:[x,.56-.42*k,.43+.41*k],pole:[0,1,-1+.9*k],rot:[-Math.PI/2,0,0]});
  P.ik.lH=arm(.19,S>0?l:0);P.ik.rH=arm(-.19,S<0?l:0);
  P.ik.lF=leg(.1,S<0?l:0);P.ik.rF=leg(-.1,S>0?l:0);
  P.props={mat:[-.1]};return P}},

quad:{p:5,kind:'hold',sides:true,hl:['Th:S'],cam:[66,12,3.1,.95,0],
 pose(ph,S){const P=base(),b=osc(ph);
  P.root.p=[-S*.02,.955+.004*b,0];P.j.chest=[0,0,S*2*D];
  const bent=S>0?'lF':'rF',stand=S>0?'rF':'lF',hold=S>0?'lH':'rH',wall=S>0?'rH':'lH';
  P.ik[stand]={t:[-S*.11,.08,0],pole:[-S*.15,0,1]};
  P.ik[bent]={t:[S*.10,.86,-.14],pole:[0,-1,.12],rot:[2.6,0,0]};
  P.ik[hold]={t:[S*.15,.91,-.16],pole:[S*.3,.1,-1]};
  P.ik[wall]={t:[-S*.57,1.22,.04],pole:[-S*.2,-1,-.2],rot:[0,-S*Math.PI/2,Math.PI]};
  P.props={wallX:[-S*.62]};P.cam=[S*66,12,3.1,.95,0];return P}},

hamstring:{p:5,kind:'hold',sides:true,hl:['Th:S','Calf:S','abs'],cam:[58,22,2.6,.35,.35],
 pose(ph,S){const P=base(),s=osc(ph),f=(28+10*s)*D;
  P.root.p=[0,.13,0];P.root.r=[f*.55,0,0];P.j.spine=[f*.25,0,0];P.j.chest=[f*.25,0,0];P.j.neck=[-f*.25,0,0];
  const st=S>0?'lF':'rF',bt=S>0?'rF':'lF';
  P.ik[st]={t:[S*.11,.07,.87],pole:[0,1,0],rot:[-Math.PI/2,0,0]};
  P.ik[bt]={t:[S*.01,.07,.30],pole:[-S,-.3,.4],rot:[0,0,S*Math.PI/2]};
  const reach=.44+.2*s;
  P.ik.lH={t:[S*.11+.075,.16,reach],pole:[.6,-1,0],rot:FLAT};P.ik.rH={t:[S*.11-.075,.16,reach],pole:[-.6,-1,0],rot:FLAT};
  P.props={mat:[.35]};P.cam=[S*58,22,2.6,.35,.35];return P}},

hipflexor:{p:5,kind:'hold',sides:true,hl:['Th:S','pelvis'],cam:[70,12,3.0,.6,-.1],
 pose(ph,S){const P=base(),s=osc(ph);
  P.root.p=[0,.5-.025*s,-.06+.08*s];P.root.r=[-3*D,0,0];P.j.spine=[-5*D*s,0,0];P.j.chest=[-3*D*s,0,0];
  P.ik[S>0?'lF':'rF']={t:[S*.1,.05,-.62],pole:[0,-1,.5],rot:[Math.PI,0,0]};
  P.ik[S>0?'rF':'lF']={t:[-S*.12,.08,.44],pole:[0,.4,1]};
  handsOnHips(P);P.props={mat:[-.05]};P.cam=[S*70,12,3.0,.6,-.1];return P}},

calfstretch:{p:5,kind:'hold',sides:true,hl:['Calf:S'],cam:[74,10,3.5,.85,.05],
 pose(ph,S){const P=base(),s=osc(ph);
  P.root.p=[0,.84,-.03+.04*s];P.root.r=[14*D,0,0];P.j.neck=[-8*D,0,0];
  P.ik[S>0?'lF':'rF']={t:[S*.1,.08,-.5],pole:[S*.1,0,1]};
  P.ik[S>0?'rF':'lF']={t:[-S*.1,.08,.34],pole:[-S*.1,0,1]};
  P.ik.lH={t:[.2,1.26,.585],pole:[1,-.6,-.5],rot:UPHAND};P.ik.rH={t:[-.2,1.26,.585],pole:[-1,-.6,-.5],rot:UPHAND};
  P.props={wallZ:[.63,1]};P.cam=[S*74,10,3.5,.85,.05];return P}},

fold:{p:6,kind:'hold',hl:['lTh','rTh','abs'],cam:[70,10,3.3,.72,.12],
 pose(ph){const P=base(),s=osc(ph);
  P.root.p=[0,.935,-.1];P.root.r=[(60+5*s)*D,0,0];P.j.spine=[(22+3*s)*D,0,0];P.j.chest=[(18+2*s)*D,0,0];P.j.neck=[14*D,0,0];
  P.ik.lH={t:[.13,.2-.05*s,.36],pole:[1,0,-.2]};P.ik.rH={t:[-.13,.2-.05*s,.36],pole:[-1,0,-.2]};return P}},

child:{p:6,kind:'hold',hl:['abs','chest','pelvis'],cam:[60,22,2.9,.3,.25],
 pose(ph){const P=base(),s=osc(ph);
  P.root.p=[0,.26,-.12];P.root.r=[78*D,0,0];P.j.spine=[(18+3*s)*D,0,0];P.j.chest=[(16-2*s)*D,0,0];P.j.neck=[4*D,0,0];P.ribs=1+.03*s;
  P.ik.lF={t:[.1,.05,-.18],pole:[0,-.5,1],rot:[Math.PI,0,0]};P.ik.rF={t:[-.1,.05,-.18],pole:[0,-.5,1],rot:[Math.PI,0,0]};
  P.ik.lH={t:[.2,.025,.78],pole:[.4,1,.2],rot:FLAT};P.ik.rH={t:[-.2,.025,.78],pole:[-.4,1,.2],rot:FLAT};
  P.props={mat:[.25]};return P}},

chest:{p:5,kind:'hold',sides:true,hl:['chest','UA:S'],cam:[38,20,3.0,1.15,0],
 pose(ph,S){const P=base(),s=osc(ph),th=(14+14*s)*D,yaw=-S*th;
  P.root.r=[0,yaw,0];P.j.chest=[-4*D*s,0,0];
  P.ik.lF={t:rotY([.11,.08,0],yaw),pole:rotY([.15,0,1],yaw)};P.ik.rF={t:rotY([-.11,.08,0],yaw),pole:rotY([-.15,0,1],yaw)};
  P.ik[S>0?'lH':'rH']={t:[S*.5,1.68,.03],pole:[S,-.7,-.15]};
  P.ik[S>0?'rH':'lH']={t:rotY([-S*.23,.85,.05],yaw),pole:rotY([-S*.3,0,-1],yaw)};
  P.props={door:[1]};P.cam=[S*38,20,3.0,1.15,0];return P}},

breath:{p:8,kind:'flow',hl:['chest','abs'],cam:[0,6,3.5,1.0,0],
 phase(ph){return ph<.5?'breathein':'breatheout'},
 pose(ph){const P=base(),s=sm(ph<.5?ph*2:2-ph*2);
  P.j.lSh=[0,0,(10+150*s)*D];P.j.rSh=[0,0,-(10+150*s)*D];P.j.lEl=[-8*D,0,0];P.j.rEl=[-8*D,0,0];
  P.j.neck=[-6*D*s,0,0];P.ribs=1+.05*s;P.root.p[1]=.955+.006*s;return P}}
};

/* ---------- scene ---------- */
let renderer,scene,camera,camera2,rig,hemi,keyL,floor,ring,props={},stageEl,insetEl;
const parts=[];                 /* {mat, part, tok} for every body mesh */
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim()||'#888';
const lin=v=>new THREE.Color(v).convertSRGBToLinear();
let hiCol;
function latheGeo(len,prof,capTop,capBot){ /* prof: [[t 0..1, r],…] top→bottom along -Y */
  const pts=[],n=6,rB=prof[prof.length-1][1],rT=prof[0][1];
  if(capBot)for(let i=0;i<n;i++){const a=-Math.PI/2+i/n*Math.PI/2;pts.push(new THREE.Vector2(Math.max(1e-4,rB*Math.cos(a)),-len+rB*Math.sin(a)*.8))}
  for(let i=prof.length-1;i>=0;i--)pts.push(new THREE.Vector2(prof[i][1],-len*prof[i][0]));
  if(capTop)for(let i=1;i<=n;i++){const a=i/n*Math.PI/2;pts.push(new THREE.Vector2(Math.max(1e-4,rT*Math.cos(a)),rT*Math.sin(a)*.8))}
  const g=new THREE.LatheGeometry(pts,28);g.computeVertexNormals();return g}
const smooth=(prof,n=10)=>{ /* resample a coarse profile with smooth interpolation */
  const out=[];for(let i=0;i<prof.length-1;i++){const[a,ra]=prof[i],[b,rb]=prof[i+1];for(let k=0;k<n;k++){const u=k/n;out.push([a+(b-a)*u,ra+(rb-ra)*sm(u)])}}
  out.push(prof[prof.length-1]);return out};
function makeRig(){
  const J={},Ms={};const SPH=new THREE.SphereGeometry(1,36,24);
  const grp=(n,p,x,y,z)=>{const o=new THREE.Group();o.position.set(x,y,z);p.add(o);J[n]=o;return o};
  const mesh=(part,tok,geo,p,pos,sc,rough)=>{const mat=new THREE.MeshStandardMaterial({roughness:rough||.62,metalness:0});
    const m=new THREE.Mesh(geo,mat);if(pos)m.position.set(pos[0],pos[1],pos[2]);if(sc)m.scale.set(sc[0],sc[1],sc[2]);
    m.castShadow=true;m.receiveShadow=true;p.add(m);parts.push({mat,part,tok});return m};
  const root=new THREE.Group();root.rotation.order='YXZ';scene.add(root);J.root=root;
  mesh('pelvis','--fig-shorts',SPH,root,[0,.01,0],[.166,.12,.119]);
  const spine=grp('spine',root,0,.06,0);mesh('abs','--fig-shirt',SPH,spine,[0,.088,.003],[.16,.165,.111]);
  const chest=grp('chest',spine,0,.21,0);Ms.ribs=mesh('chest','--fig-shirt',SPH,chest,[0,.112,0],[.18,.165,.12]);mesh('chest','--fig-shirt',SPH,chest,[0,.205,-.004],[.21,.066,.098]);
  const neck=grp('neck',chest,0,.27,0);mesh('neck','--fig-skin',latheGeo(.11,[[0,.04],[1,.046]],true,false),neck,[0,.095,0]);
  const head=grp('head',neck,0,.085,0);
  mesh('head','--fig-skin',SPH,head,[0,.1,.005],[.094,.116,.104]);
  const hair=new THREE.SphereGeometry(1,32,16,0,TAU,0,Math.PI*.5);
  const hm=mesh('head','--fig-hair',hair,head,[0,.1,.003],[.1,.123,.121],.85);hm.rotation.x=-22*D;
  for(const s of[1,-1])mesh('eye','--fig-eye',SPH,head,[s*.034,.106,.094],[.0105,.013,.008],.3);
  const upper=smooth([[0,.052],[.3,.053],[.75,.044],[1,.04]]),fore=smooth([[0,.041],[.25,.044],[.8,.032],[1,.03]]);
  const thigh=smooth([[0,.082],[.25,.083],[.8,.06],[1,.055]]),calf=smooth([[0,.052],[.28,.06],[.75,.041],[1,.037]]);
  const sleeve=smooth([[0,.058],[.3,.059],[.44,.054]]),shortLeg=smooth([[0,.088],[.25,.089],[.5,.08]]);
  for(const s of[1,-1]){const L=s>0?'l':'r';
    const clav=grp(L+'Clav',chest,0,.225,0);clav.userData.base=[0,.225,0];
    const sh=grp(L+'Sh',clav,s*.19,0,0);
    mesh(L+'UA','--fig-shirt',SPH,sh,[0,-.004,0],[.066,.064,.064]);
    mesh(L+'UA','--fig-skin',latheGeo(.29,upper,true,true),sh);
    mesh(L+'UA','--fig-shirt',latheGeo(.29,sleeve,false,false),sh);
    const el=grp(L+'El',sh,0,-.29,0);mesh(L+'FA','--fig-skin',SPH,el,null,[.042,.042,.042]);mesh(L+'FA','--fig-skin',latheGeo(.27,fore,true,true),el);
    const wr=grp(L+'Wr',el,0,-.27,0);
    mesh(L+'FA','--fig-skin',SPH,wr,[0,-.05,0],[.04,.052,.019]);
    mesh(L+'FA','--fig-skin',SPH,wr,[0,-.108,.004],[.036,.045,.016]);
    const th=mesh(L+'FA','--fig-skin',SPH,wr,[-s*.04,-.062,.008],[.014,.032,.014]);th.rotation.z=-s*.5;
    const hip=grp(L+'Hip',root,s*.095,-.02,0);
    mesh(L+'Th','--fig-skin',latheGeo(.44,thigh,true,true),hip);
    mesh(L+'Th','--fig-shorts',latheGeo(.44,shortLeg,true,false),hip);
    const kn=grp(L+'Kn',hip,0,-.44,0);mesh(L+'Calf','--fig-skin',SPH,kn,null,[.054,.054,.054]);mesh(L+'Calf','--fig-skin',latheGeo(.43,calf,true,true),kn);
    const an=grp(L+'An',kn,0,-.43,0);
    mesh('shoe','--fig-shoe',SPH,an,[0,-.02,-.01],[.046,.05,.056]);
    mesh('shoe','--fig-shoe',SPH,an,[0,-.045,.075],[.049,.035,.112]);
    mesh('sole','--fig-sole',new THREE.BoxGeometry(.086,.014,.215),an,[0,-.073,.062]);
  }
  return{J,M:Ms}}
function makeProps(){
  const pm=new THREE.MeshStandardMaterial({roughness:.92});props.pm=pm;
  const wm=new THREE.MeshStandardMaterial({roughness:.92,transparent:true,opacity:.4,depthWrite:false});props.wm=wm;
  const wz=new THREE.Mesh(new THREE.BoxGeometry(2.1,2.3,.06),wm);wz.renderOrder=2;wz.position.y=1.15;wz.receiveShadow=true;scene.add(wz);props.wallZ=wz;
  const wx=new THREE.Mesh(new THREE.BoxGeometry(.06,2.3,1.7),wm);wx.renderOrder=2;wx.position.y=1.15;wx.receiveShadow=true;scene.add(wx);props.wallX=wx;
  const mm=new THREE.MeshStandardMaterial({roughness:.85});props.mm=mm;
  const mat=new THREE.Mesh(new THREE.BoxGeometry(.7,.014,1.95),mm);mat.position.y=.007;mat.receiveShadow=true;scene.add(mat);props.mat=mat;
  const door=new THREE.Group();
  for(const s of[1,-1]){const p=new THREE.Mesh(new THREE.BoxGeometry(.08,2.08,.16),pm);p.position.set(s*.58,1.04,0);p.castShadow=p.receiveShadow=true;door.add(p)}
  const lt=new THREE.Mesh(new THREE.BoxGeometry(1.24,.08,.16),pm);lt.position.set(0,2.12,0);door.add(lt);scene.add(door);props.door=door;
  const bm=new THREE.MeshStandardMaterial({roughness:.8});props.bm=bm;
  const bench=new THREE.Group();const seat=new THREE.Mesh(new THREE.BoxGeometry(1.05,.12,.5),bm);seat.position.y=.4;seat.castShadow=seat.receiveShadow=true;bench.add(seat);
  for(const sx of[1,-1])for(const sz of[1,-1]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.06,.34,.06),pm);leg.position.set(sx*.47,.17,sz*.2);leg.castShadow=true;bench.add(leg)}
  scene.add(bench);props.bench=bench;
}
function applyTheme(){
  if(!scene)return;const st=lin(css('--stage'));
  scene.background=st;scene.fog=new THREE.Fog(st,7,15);
  floor.material.color.copy(lin(css('--floor')));ring.material.color.copy(lin(css('--muted')));
  hiCol=lin(css('--accent'));
  for(const p of parts)p.base=lin(css(p.tok));
  props.pm.color.copy(lin(css('--prop')));props.wm.color.copy(lin(css('--wall')));props.mm.color.copy(lin(css('--mat')));props.bm.color.copy(lin(css('--bench')));
  const light=css('--is-light')==='1';
  hemi.intensity=light?.62:.6;keyL.intensity=light?.62:.72;
}
RF.applyStageTheme=applyTheme;
function init(el){
  if(renderer||typeof THREE==='undefined')return !!renderer;
  stageEl=el;insetEl=el.querySelector('.inset');
  try{renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true})}catch(e){return false}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputEncoding=THREE.sRGBEncoding;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.autoClear=false;
  el.prepend(renderer.domElement);
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(34,1,.05,40);camera2=new THREE.PerspectiveCamera(30,1,.05,40);
  hemi=new THREE.HemisphereLight(0xffffff,0x4a5a62,.6);scene.add(hemi);
  keyL=new THREE.DirectionalLight(0xffffff,.72);keyL.castShadow=true;keyL.shadow.mapSize.set(2048,2048);
  const c=keyL.shadow.camera;c.left=-2.4;c.right=2.4;c.top=2.8;c.bottom=-1.6;c.near=.5;c.far=14;keyL.shadow.bias=-.0004;keyL.shadow.normalBias=.02;keyL.shadow.radius=4;scene.add(keyL);scene.add(keyL.target);
  const rim=new THREE.DirectionalLight(0xffe2cc,.32);rim.position.set(-3,2.6,-3.2);scene.add(rim);
  const fill=new THREE.DirectionalLight(0xd8ecff,.18);fill.position.set(-3,1.5,2.5);scene.add(fill);
  floor=new THREE.Mesh(new THREE.CircleGeometry(9,72),new THREE.MeshStandardMaterial({roughness:.97}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
  ring=new THREE.Mesh(new THREE.RingGeometry(1.25,1.265,128),new THREE.MeshBasicMaterial({transparent:true,opacity:.22}));ring.rotation.x=-Math.PI/2;ring.position.y=.003;scene.add(ring);
  makeProps();rig=makeRig();vecs();applyTheme();
  new ResizeObserver(resize).observe(el);resize();
  let drag=null,lastTap=0;
  el.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;drag={x:e.clientX,y:e.clientY,yaw:cam.uy,pitch:cam.up};try{el.setPointerCapture(e.pointerId)}catch(_){}
    const n=performance.now();if(n-lastTap<300){cam.uy=0;cam.up=0}lastTap=n});
  el.addEventListener('pointermove',e=>{if(!drag)return;cam.uy=drag.yaw-(e.clientX-drag.x)*.45;cam.up=clamp(drag.pitch+(e.clientY-drag.y)*.2,-15,40)});
  el.addEventListener('pointerup',()=>drag=null);el.addEventListener('pointercancel',()=>drag=null);
  return true}
function resize(){if(!renderer)return;const w=stageEl.clientWidth,h=stageEl.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w/h<.8?44:34;camera.updateProjectionMatrix()}

/* ---------- IK + pose application ---------- */
const LIMBS=[['lF','lHip','lKn','lAn',.44,.43,1],['rF','rHip','rKn','rAn',.44,.43,1],['lH','lSh','lEl','lWr',.29,.27,0],['rH','rSh','rEl','rWr',.29,.27,0]];
const JOINTS=['spine','chest','neck','head','lSh','rSh','lEl','rEl','lWr','rWr','lHip','rHip','lKn','rKn','lAn','rAn'];
let V,Q;
function vecs(){const v=()=>new THREE.Vector3();V={a:v(),t:v(),p:v(),d:v(),e:v(),u:v(),v:v(),h:v(),X:v(),Y:v(),Z:v(),up:new THREE.Vector3(0,1,0)};
  Q={pq:new THREE.Quaternion(),u:new THREE.Quaternion(),l:new THREE.Quaternion(),d:new THREE.Quaternion(),y:new THREE.Quaternion(),m:new THREE.Matrix4(),eu:new THREE.Euler()}}
function basisQ(h,w,out){V.Y.copy(w).negate();V.X.copy(h).addScaledVector(V.Y,-h.dot(V.Y)).normalize();V.Z.crossVectors(V.X,V.Y);Q.m.makeBasis(V.X,V.Y,V.Z);return out.setFromRotationMatrix(Q.m)}
function solve(U,Lo,E,L1,L2,s,foot){
  U.parent.updateMatrixWorld(true);V.a.setFromMatrixPosition(U.matrixWorld);
  V.t.set(s.t[0],s.t[1],s.t[2]);V.d.subVectors(V.t,V.a);let d=V.d.length();V.d.normalize();d=clamp(d,.04,L1+L2-.001);
  const ca=clamp((L1*L1+d*d-L2*L2)/(2*L1*d),-1,1),sa=Math.sqrt(1-ca*ca);
  V.p.set(s.pole[0],s.pole[1],s.pole[2]);V.p.addScaledVector(V.d,-V.p.dot(V.d));if(V.p.lengthSq()<1e-8)V.p.set(0,0,1);V.p.normalize();
  V.e.copy(V.a).addScaledVector(V.d,L1*ca).addScaledVector(V.p,L1*sa);V.t.copy(V.a).addScaledVector(V.d,d);
  V.u.subVectors(V.e,V.a).normalize();V.v.subVectors(V.t,V.e).normalize();V.h.crossVectors(V.p,V.d).normalize();
  basisQ(V.h,V.u,Q.u);basisQ(V.h,V.v,Q.l);
  U.parent.getWorldQuaternion(Q.pq);U.quaternion.copy(Q.pq.invert().multiply(Q.u));
  Lo.quaternion.copy(Q.u.clone().invert().multiply(Q.l));
  const rot=s.rot||(foot?Z3:null);
  if(rot){Q.d.setFromEuler(Q.eu.set(rot[0],rot[1],rot[2]));Q.d.premultiply(Q.y);E.quaternion.copy(Q.l.clone().invert().multiply(Q.d))}
  else E.quaternion.identity();
}
function applyPose(P){
  const J=rig.J;J.root.position.set(P.root.p[0],P.root.p[1],P.root.p[2]);J.root.rotation.set(P.root.r[0],P.root.r[1],P.root.r[2]);
  for(const n of JOINTS){const e=P.j[n]||Z3;J[n].quaternion.identity();J[n].rotation.set(e[0],e[1],e[2])}
  for(const L of['l','r']){const c=J[L+'Clav'],b=c.userData.base,o=P.j[L+'ClavP']||Z3;c.position.set(b[0]+o[0],b[1]+o[1],b[2]+o[2])}
  rig.M.ribs.scale.set(.18*P.ribs,.165*(1+(P.ribs-1)*.4),.12*P.ribs);
  J.root.updateMatrixWorld(true);if(P.fix){P.fix(J);J.root.updateMatrixWorld(true)}
  Q.y.setFromAxisAngle(V.up,J.root.rotation.y);
  for(const[k,u,l,e,L1,L2,f]of LIMBS){const s=P.ik[k];if(s)solve(J[u],J[l],J[e],L1,L2,s,f)}
  const pr=P.props;
  props.wallZ.visible=!!pr.wallZ;if(pr.wallZ)props.wallZ.position.z=pr.wallZ[0]+.03*(pr.wallZ[1]||1);
  props.wallX.visible=!!pr.wallX;if(pr.wallX)props.wallX.position.x=pr.wallX[0]+(pr.wallX[0]<0?-.03:.03);
  props.mat.visible=!!pr.mat;if(pr.mat)props.mat.position.z=pr.mat[0];
  props.door.visible=!!pr.door;
  props.bench.visible=!!pr.bench;if(pr.bench)props.bench.position.z=pr.bench[0];
}
function lerpPose(A,B,w){
  const L=(a,b)=>a.map((x,i)=>x+(b[i]-x)*w);
  const P={root:{p:L(A.root.p,B.root.p),r:L(A.root.r,B.root.r)},j:{},ik:{},ribs:A.ribs+(B.ribs-A.ribs)*w,fix:A.fix===B.fix?A.fix:undefined,props:{},cam:w<.5?A.cam:B.cam};
  for(const k of new Set([...Object.keys(A.j),...Object.keys(B.j)]))P.j[k]=L(A.j[k]||Z3,B.j[k]||Z3);
  for(const k of new Set([...Object.keys(A.ik),...Object.keys(B.ik)])){const a=A.ik[k],b=B.ik[k];
    if(a&&b)P.ik[k]={t:L(a.t,b.t),pole:L(a.pole,b.pole),rot:(a.rot||b.rot)?L(a.rot||Z3,b.rot||Z3):undefined};else P.ik[k]=w<.5?a:b}
  for(const k of new Set([...Object.keys(A.props),...Object.keys(B.props)])){const a=A.props[k],b=B.props[k];P.props[k]=a&&b?L(a,b):(w<.5?a:b)}
  return P}
RF.lerpPose=lerpPose;
/* pose of move `id` at time t (seconds into the move); dur = full length, used to place the side switch */
RF.evalPose=function(id,t,dur,forceSide){
  const m=M[id],ph=(((t%m.p)+m.p)%m.p)/m.p;
  if(!m.sides||forceSide)return m.pose(ph,forceSide||1);
  const half=dur/2,w=sm((t-(half-.9))/1.8);
  if(w<=0)return m.pose(ph,1);if(w>=1)return m.pose(ph,-1);
  return lerpPose(m.pose(ph,1),m.pose(ph,-1),w)};
RF.sideOf=(id,t,dur,forceSide)=>forceSide||(M[id].sides&&t>=dur/2?-1:1);
RF.phaseOf=(id,t)=>{const m=M[id];if(!m.phase)return null;return m.phase((((t%m.p)+m.p)%m.p)/m.p)};
function setHighlight(id,S,time,on){
  const keys=on?M[id].hl.map(k=>k.endsWith(':S')?(S>0?'l':'r')+k.slice(0,-2):k):[];
  const pulse=.5+.5*Math.sin(time*3.2);
  for(const p of parts){const h=keys.includes(p.part),m=p.mat;m.color.copy(p.base);if(h)m.color.lerp(hiCol,.62);m.emissive.copy(hiCol);m.emissiveIntensity=h?.1+.16*pulse:0}
}
/* ---------- cameras ---------- */
const cam=RF.cam={yaw:28,pitch:9,dist:3.4,ty:.95,tz:0,uy:0,up:0,tgt:null};
RF.camTo=(c,snap)=>{cam.tgt=c;if(snap){cam.yaw=c[0];cam.pitch=c[1];cam.dist=c[2];cam.ty=c[3];cam.tz=c[4]||0}};
function place(c,yawDeg,pitchDeg,dist){const y=yawDeg*D,p=clamp(pitchDeg,-10,60)*D;
  c.position.set(Math.sin(y)*Math.cos(p)*dist,cam.ty+Math.sin(p)*dist,cam.tz+Math.cos(y)*Math.cos(p)*dist);c.lookAt(0,cam.ty,cam.tz)}
function camStep(dt){
  if(cam.tgt){const k=dt<=0?1:1-Math.exp(-dt*2.6),t=cam.tgt;cam.yaw+=(t[0]-cam.yaw)*k;cam.pitch+=(t[1]-cam.pitch)*k;cam.dist+=(t[2]-cam.dist)*k;cam.ty+=(t[3]-cam.ty)*k;cam.tz+=((t[4]||0)-cam.tz)*k}
  place(camera,cam.yaw+cam.uy,cam.pitch+cam.up,cam.dist*(camera.aspect<.8?1.16:1));
  const side=Math.abs(cam.yaw)>=45;place(camera2,side?cam.yaw-Math.sign(cam.yaw)*72:cam.yaw+72,14,cam.dist*1.25);
  keyL.position.set(2.4,4.4,cam.tz+3.2);keyL.target.position.set(0,0,cam.tz);keyL.target.updateMatrixWorld();
  ring.position.z=0;
}
/* draw one frame: pose P for move id */
RF.draw=function(id,P,S,time,dt,highlight,twoViews){
  if(!renderer)return;
  applyPose(P);if(P.cam&&cam.tgt!==P.cam)cam.tgt=P.cam;
  setHighlight(id,S,time,highlight);camStep(dt);
  const w=stageEl.clientWidth,h=stageEl.clientHeight;
  renderer.setScissorTest(false);renderer.setViewport(0,0,w,h);renderer.clear();renderer.render(scene,camera);
  const show=twoViews&&insetEl&&w>=300;if(insetEl)insetEl.hidden=!show;
  if(show){const a=stageEl.getBoundingClientRect(),b=insetEl.getBoundingClientRect(),x=b.left-a.left,y=a.bottom-b.bottom;
    if(b.width>20){renderer.setScissorTest(true);renderer.setScissor(x,y,b.width,b.height);renderer.setViewport(x,y,b.width,b.height);
      camera2.aspect=b.width/b.height;camera2.updateProjectionMatrix();renderer.clear();renderer.render(scene,camera2);renderer.setScissorTest(false)}}
};
RF.initStage=init;RF.resizeStage=resize;RF.hasStage=()=>!!renderer;
})();
