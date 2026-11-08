class_name AppShell
extends Control
var nav:=Navigation.new();var coordinator:=MatchCoordinator.new();var rng:=RandomNumberGenerator.new()
@onready var title:Label=$Margin/VBox/Title
@onready var info:Label=$Margin/VBox/Info
@onready var actions:VBoxContainer=$Margin/VBox/Actions
func _ready()->void:add_child(nav);add_child(coordinator);rng.randomize();nav.changed.connect(_render);_render(&"home",{})
func _clear()->void:for c in actions.get_children():c.queue_free()
func _button(label:String,call:Callable)->void:
 var b:=Button.new();b.text=label;b.custom_minimum_size=Vector2(0,68);b.pressed.connect(call);actions.add_child(b)
func _render(screen:StringName,payload:Dictionary)->void:
 _clear();info.text=""
 match screen:
  &"home":_home()
  &"league":_league()
  &"locker":_locker()
  &"market":_market()
  &"packs":_packs()
  &"match":_match()
  _: _home()
func _home()->void:
 title.text="FOOTBALL CARDS";info.text="Godot Edition · Carrera %s · %d monedas"%[CareerService.data.formation,CareerService.data.coins]
 _button("⚽ LIGA",func():nav.go(&"league"));_button("🏟 AMISTOSO",func():coordinator.begin(rng.randi(),&"friendly");nav.go(&"match"));_button("👕 VESTUARIO",func():nav.go(&"locker"));_button("💰 FICHAJES",func():nav.go(&"market"));_button("🎁 SOBRES",func():nav.go(&"packs"))
func _league()->void:
 title.text="MI LIGA";if LeagueService.season.is_empty():LeagueService.new_season()
 info.text="Jornada %d\n%s"%[LeagueService.season.round,LeagueService.table_text()]
 _button("JUGAR JORNADA",func():coordinator.begin(rng.randi(),&"league");nav.go(&"match"));_button("← VOLVER",func():nav.go(&"home"))
func _locker()->void:
 title.text="VESTUARIO";var squad:Array=CareerService.data.squad if not CareerService.data.squad.is_empty() else ManagerService.squad
 var line:=FormationService.auto_lineup(squad,CareerService.data.formation);var rows:=PackedStringArray()
 for x in line:rows.append("%-3s  %-18s  %2d"%[x.slot,str(x.player.name),x.effective])
 info.text="Formación: %s\n\n%s"%[CareerService.data.formation,"\n".join(rows)]
 for f in FormationService.FORMATIONS.keys():_button(str(f),func(form=f):CareerService.set_formation(form);_locker())
 _button("← VOLVER",func():nav.go(&"home"))
func _market()->void:
 title.text="FICHAJES";var offers:=MarketService.refresh(int(Time.get_unix_time_from_system()/86400),int(CareerService.data.division));info.text="Saldo: %d monedas"%CareerService.data.coins
 for i in offers.size():var p:Dictionary=offers[i];_button("%s · %s · OVR %d · %d"%[p.name,p.pos,p.ovr,p.price],func(idx=i):MarketService.buy(idx);_market())
 _button("← VOLVER",func():nav.go(&"home"))
func _packs()->void:
 title.text="SOBRES Y TALLER";info.text="Fichas: %d · Sobres abiertos: %d"%[EconomyService.state.tokens,EconomyService.state.packs]
 _button("ABRIR SOBRE",func():var pack=EconomyService.open_pack(rng);info.text="\n".join(pack.map(func(c):return "%s · %s · %s"%[c.rarity,c.pos,c.ovr])))
 _button("CANJEAR 30 FICHAS → ÉPICA",func():EconomyService.craft("E");_packs());_button("← VOLVER",func():nav.go(&"home"))
func _match()->void:
 title.text="PARTIDO";var s:=coordinator.state
 if s.is_empty():s=coordinator.begin(rng.randi())
 info.text="%02d'   LOCAL %d - %d RIVAL\nPosesión: %s · Energía %.0f%%"%[s.minute,s.score[0],s.score[1],"LOCAL" if s.possession==0 else "RIVAL",s.energy[0]]
 for a in CoreRules.ATTACK:_button(str(a).capitalize(),func(action=a):coordinator.player_action(action);_match())
 _button("← ABANDONAR",func():nav.go(&"home"))
