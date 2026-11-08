extends Node

const PASS_LEVELS:=40
var state:Dictionary={"day_key":"","played_today":0,"won_today":0,"streak":0,"calendar_day":0,"last_seen":0,"xp":0,"level":1,"free_premium":0,"tokens":0}

func register_result(won:bool,goals:int,now_unix:int)->Dictionary:
    var day:=Time.get_date_string_from_unix_time(now_unix)
    var awards:Array=[]
    if state.day_key!=day:
        state.day_key=day; state.played_today=0; state.won_today=0
        state.calendar_day=state.calendar_day%7+1
        awards.append({"type":"calendar","day":state.calendar_day})
    var away_days:=0
    if state.last_seen>0: away_days=int((now_unix-state.last_seen)/86400)
    if away_days>=5:
        state.free_premium+=1
        awards.append({"type":"return","premium":1,"double_xp":true})
    state.played_today+=1
    if won:
        state.won_today+=1; state.streak+=1
        if state.won_today==1: awards.append({"type":"first_win","card":1})
        if state.streak==3: awards.append({"type":"pack","quality":"standard"})
        if state.streak==5: state.free_premium+=1; awards.append({"type":"pack","quality":"gold"})
    else: state.streak=0
    var gain:=100+goals*25+(75 if won else 0)
    if away_days>=5: gain*=2
    state.xp+=gain; state.level=clampi(1+state.xp/500,1,PASS_LEVELS); state.last_seen=now_unix
    return {"awards":awards,"xp":gain,"half_box_office":state.played_today>=7,"state":state.duplicate(true)}
