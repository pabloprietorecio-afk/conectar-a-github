extends Node3D

var card_match := CardMatch.new()
var buttons: Array[Button] = []
@onready var player: PlayerAvatar = $Player
@onready var weather: WeatherController = $Weather
@onready var status: Label = $UI/Margin/VBox/Status
@onready var cards: HBoxContainer = $UI/Margin/VBox/Cards
@onready var commentary: Label = $UI/Margin/VBox/Commentary
@onready var table: Label = $UI/Margin/VBox/Table

func _ready() -> void:
    GameState.start_match()
    card_match.changed.connect(_render)
    card_match.finished.connect(_match_finished)
    card_match.start(int(GameState.current_match.seed))
    for i in 5:
        var b := Button.new()
        b.custom_minimum_size = Vector2(180, 150)
        b.pressed.connect(_play.bind(i))
        cards.add_child(b)
        buttons.append(b)
    _render(card_match.snapshot())

func _play(index: int) -> void:
    player.set_motion(5.8)
    card_match.play_card(index)

func _render(s: Dictionary) -> void:
    status.text = "%02d'     LOCAL %d  ·  %d RIVAL     %s" % [s.minute, s.score[0], s.score[1], "POSESIÓN" if s.possession == 0 else "DEFENSA"]
    var hand: Array = s.hand
    for i in buttons.size():
        if i < hand.size():
            var c: Dictionary = hand[i]
            buttons[i].text = "%s\n%s\nPOT %d" % [c.name, c.rarity, c.power]
            buttons[i].disabled = s.ended
    commentary.text = "\n".join(PackedStringArray(s.log))
    table.text = LeagueService.table_text()

func _match_finished(s: Dictionary) -> void:
    GameState.finish_match(s.score[0], s.score[1])
    LeagueService.record_user_result(s.score[0], s.score[1])
    player.celebrate()
    _render(s)

func _on_weather_pressed() -> void:
    var next := (weather.current + 1) % WeatherController.Weather.size()
    weather.set_weather(next, 0.7)

func _on_action_pressed() -> void:
    card_match.start(int(Time.get_unix_time_from_system()))
