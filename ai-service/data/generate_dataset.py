import csv
import random

random.seed(42)

output = "data/training_data.csv"
transport_modes = ["walking", "auto", "cab", "bus", "mixed"]

with open(output, "w", newline="") as f:
    writer = csv.writer(f)

    writer.writerow([
        "hour_of_day",
        "day_of_week",
        "transport_mode",
        "route_length_meters",
        "danger_spot_count",
        "crowd_density",
        "historical_incident_density",
        "lighting_score",
        "risk_score",
    ])

    for _ in range(1000):
        hour = random.randint(0, 23)
        day = random.randint(0, 6)
        mode = random.choice(transport_modes)
        route_length = random.randint(500, 10000)
        danger_spots = random.randint(0, 5)
        crowd = round(random.uniform(0.05, 1.0), 2)
        historical = round(random.uniform(0, 1.0), 2)

        if 6 <= hour <= 17:
            lighting = round(random.uniform(0.6, 1.0), 2)
        elif 18 <= hour <= 21:
            lighting = round(random.uniform(0.3, 0.8), 2)
        else:
            lighting = round(random.uniform(0.05, 0.4), 2)

        score = 0

        if hour in {22, 23, 0, 1, 2, 3, 4, 5}:
            score += 30
        elif hour in {18, 19, 20, 21}:
            score += 15

        score += historical * 30
        score += min(danger_spots * 6, 25)
        score += (1 - lighting) * 15
        score += (1 - crowd) * 10
        score += min(route_length / 1000 * 1.5, 10)

        multipliers = {
            "walking": 1.2,
            "mixed": 1.1,
            "bus": 0.95,
            "auto": 0.9,
            "cab": 0.75,
        }

        score *= multipliers[mode]

        if day in {5, 6} and hour >= 18:
            score += 5

        risk_score = round(max(0, min(100, score)), 2)

        writer.writerow([
            hour, day, mode, route_length, danger_spots,
            crowd, historical, lighting, risk_score
        ])

print("Generated 1000 simulated training records.")
print(f"Saved to {output}")
