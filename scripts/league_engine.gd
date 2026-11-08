class_name LeagueEngine
extends RefCounted

const CATEGORY := {5:"Bronce",4:"Plata",3:"Oro",2:"Diamante",1:"Leyenda"}
const UP_DIRECT := 4
const UP_PLAYOFF := [5,6]
const DOWN_DIRECT := [19,20]
const DOWN_PLAYOFF := 18
const MU_HOME := 1.52
const MU_AWAY := 1.38
const KPT := 0.03

static func make_schedule(teams:Array, legs:int, rng:RandomNumberGenerator) -> Array:
    var t:=teams.duplicate(); _shuffle(t,rng)
    if t.size()%2: t.append("BYE")
    var n:=t.size(); var m:=n-1; var rounds:Array=[]
    for k in m:
        var pairs:Array=[]
        for i in n/2:
            var h:int=(k+i)%m
            var a:int=m if i==0 else (m-i+k)%m
            if (i==0 and k%2==1) or (i!=0 and i%2==1):
                var z=h; h=a; a=z
            if t[h]!="BYE" and t[a]!="BYE": pairs.append([t[h],t[a]])
        rounds.append(pairs)
    if legs==2:
        var second:Array=[]
        for rd in rounds:
            var reverse:Array=[]
            for p in rd: reverse.append([p[1],p[0]])
            second.append(reverse)
        rounds.append_array(second)
    return rounds

static func table(teams:Array, matches:Array) -> Array:
    var stats:Dictionary={}
    for id in teams: stats[id]={"id":id,"pj":0,"pg":0,"pe":0,"pp":0,"gf":0,"gc":0,"pts":0,"form":[]}
    var played:=matches.filter(func(m): return m.get("score")!=null)
    played.sort_custom(func(a,b): return a.get("round",0)<b.get("round",0))
    for match in played:
        var h=stats.get(match.home); var a=stats.get(match.away)
        if h==null or a==null: continue
        var g1:int=match.score[0]; var g2:int=match.score[1]
        h.pj+=1; a.pj+=1; h.gf+=g1; h.gc+=g2; a.gf+=g2; a.gc+=g1
        if g1>g2:
            h.pg+=1; a.pp+=1; h.pts+=3; h.form.append("V"); a.form.append("D")
        elif g1<g2:
            a.pg+=1; h.pp+=1; a.pts+=3; a.form.append("V"); h.form.append("D")
        else:
            h.pe+=1; a.pe+=1; h.pts+=1; a.pts+=1; h.form.append("E"); a.form.append("E")
    var rows:Array=stats.values()
    for row in rows:
        row.dg=row.gf-row.gc
        if row.form.size()>5: row.form=row.form.slice(row.form.size()-5)
    rows.sort_custom(func(a,b):
        if a.pts!=b.pts: return a.pts>b.pts
        if a.dg!=b.dg: return a.dg>b.dg
        if a.gf!=b.gf: return a.gf>b.gf
        return str(a.id)<str(b.id))
    for i in rows.size(): rows[i].pos=i+1
    return rows

static func poisson(lambda:float,rng:RandomNumberGenerator)->int:
    var limit:=exp(-lambda); var k:=0; var p:=1.0
    while true:
        k+=1; p*=rng.randf()
        if p<=limit: return k-1
    return 0

static func simulate_score(home:Dictionary,away:Dictionary,rng:RandomNumberGenerator)->Array:
    var dh:float=(float(home.att)-float(away.def))*KPT
    var da:float=(float(away.att)-float(home.def))*KPT
    return [poisson(clampf(MU_HOME+dh,.25,3.4),rng),poisson(clampf(MU_AWAY+da,.25,3.2),rng)]

static func season_outcome(position:int,division:int,playoff_won:bool=false)->Dictionary:
    var change:=0; var star:=false; var playoff:=""
    if position<=UP_DIRECT:
        if division==1: star=true
        else: change=-1
    elif position in UP_PLAYOFF: playoff="promotion"
    elif position in DOWN_DIRECT: change=1
    elif position==DOWN_PLAYOFF: playoff="relegation"
    if playoff_won and playoff=="promotion":
        if division==1: star=true
        else: change=-1
    elif not playoff_won and playoff=="relegation": change=1
    return {"division_change":change,"star":star,"playoff":playoff,"category":CATEGORY.get(clampi(division+change,1,5),"")}

static func _shuffle(a:Array,rng:RandomNumberGenerator)->void:
    for i in range(a.size()-1,0,-1):
        var j:=rng.randi_range(0,i); var z=a[i]; a[i]=a[j]; a[j]=z
