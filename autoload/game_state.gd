extends Node

signal match_started(seed: int)
signal match_finished(home_goals: int, away_goals: int)
signal weather_changed(kind: StringName, intensity: float)

const SAVE_PATH := "user://football_cards_save.json"
var rng := RandomNumberGenerator.new()
var current_match: Dictionary = {}
var profile: Dictionary = {"version": 1, "matches": 0, "wins": 0}

func _ready() -> void:
    load_game()

func start_match(seed_value: int = 0) -> void:
    if seed_value == 0:
        seed_value = int(Time.get_unix_time_from_system())
    rng.seed = seed_value
    current_match = {"seed": seed_value, "minute": 0, "score": [0, 0]}
    match_started.emit(seed_value)

func finish_match(home_goals: int, away_goals: int) -> void:
    profile.matches = int(profile.get("matches", 0)) + 1
    if home_goals > away_goals:
        profile.wins = int(profile.get("wins", 0)) + 1
    current_match = {}
    save_game()
    match_finished.emit(home_goals, away_goals)

func save_game() -> void:
    var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
    if f:
        f.store_string(JSON.stringify({"profile": profile, "current_match": current_match}, "  "))

func load_game() -> void:
    if not FileAccess.file_exists(SAVE_PATH):
        return
    var f := FileAccess.open(SAVE_PATH, FileAccess.READ)
    if not f:
        return
    var data = JSON.parse_string(f.get_as_text())
    if data is Dictionary:
        profile = data.get("profile", profile)
        current_match = data.get("current_match", {})
