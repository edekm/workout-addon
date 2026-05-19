# Workout - Home Assistant Add-on

Add-on do śledzenia treningów kalisteniki / bodyweight dla dwóch profili z konfigurowalnymi nazwami. Dostępny przez Ingress wewnątrz Home Assistant.

## Instalacja

1. W Home Assistant: **Settings → Add-ons → Add-on Store → ⋮ → Repositories**
2. Dodaj URL repozytorium:
   ```
   https://github.com/edekm/workout-addon
   ```
3. Po dodaniu, na liście add-onów pojawi się **Workout**. Zainstaluj.
4. W zakładce **Configuration** ustaw nazwy obu profili (`user1_name`, `user2_name`).
5. Start → **Open Web UI**.

## Konfiguracja

| Opcja | Default | Opis |
|-------|---------|------|
| `user1_name` | `M` | Nazwa pierwszego profilu |
| `user2_name` | `Ona` | Nazwa drugiego profilu |
| `log_level` | `info` | Poziom logowania (trace / debug / info / notice / warning / error / fatal) |

## Architektura

- **Stack:** SvelteKit (adapter-node) + SQLite
- **Hosting:** HA Add-on z Ingress
- **Dane:** baza SQLite w `/data` add-ona — objęte backupami Home Assistant
- **Multi-arch:** aarch64, amd64

## Wymagania

- Home Assistant OS lub Supervised
- Architektura aarch64 lub amd64

## Status

Wczesna wersja (0.1.0) — scaffolding. Funkcjonalność w trakcie budowy.
