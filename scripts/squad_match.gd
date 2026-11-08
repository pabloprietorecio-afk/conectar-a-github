class_name SquadMatch
extends RefCounted
const MAX_SUBS:=5
var teams:Array=[]; var energy:Array=[]; var injuries:Array=[]; var subs:=[0,0]; var subbed_out:Array=[]
func setup(home:Array,away:Array)->void:
 teams=[home.duplicate(true),away.duplicate(true)]; energy=[[],[]]; injuries=[[],[]]; subbed_out=[[],[]];subs=[0,0]
 for side in 2:
  for p in teams[side]:energy[side].append(float(p.get("energy",100)));injuries[side].append(0)
func check_injury(side:int,index:int,severity:String,rng:RandomNumberGenerator)->Dictionary:
 if index<0 or index>=teams[side].size() or injuries[side][index]>0:return {"injured":false}
 var chance:=.30 if severity=="grave" else .06; var games:=rng.randi_range(2,4) if severity=="grave" else rng.randi_range(1,2)
 if rng.randf()<chance:injuries[side][index]=games;energy[side][index]=minf(energy[side][index],25);return {"injured":true,"games":games}
 return {"injured":false}
func fatigue_injury_sweep(rng:RandomNumberGenerator)->Array:
 var hits:Array=[]
 for side in 2:
  for i in energy[side].size():
   if i>0 and energy[side][i]<22 and injuries[side][i]==0 and rng.randf()<.01:
    injuries[side][i]=1;energy[side][i]=minf(energy[side][i],25);hits.append({"side":side,"index":i,"games":1})
 return hits
func substitute(side:int,out_index:int,in_player:Dictionary)->bool:
 if subs[side]>=MAX_SUBS or out_index<=0 or out_index>=teams[side].size():return false
 subbed_out[side].append(teams[side][out_index].get("id",out_index));teams[side][out_index]=in_player.duplicate(true)
 energy[side][out_index]=float(in_player.get("energy",100));injuries[side][out_index]=0;subs[side]+=1;return true
func halftime_rest(amount:float)->void:
 for side in 2:
  for i in energy[side].size():energy[side][i]=minf(100,energy[side][i]+amount)
func drain(side:int,index:int,amount:float)->void:
 if index>=0 and index<energy[side].size():energy[side][index]=maxf(0,energy[side][index]-amount)
func tired_candidate(side:int,minute:int)->int:
 if minute<55:return -1
 var best:=-1;var low:=101.0
 for i in range(1,energy[side].size()):
  if energy[side][i]<low and injuries[side][i]==0:low=energy[side][i];best=i
 return best if low<42 else -1
