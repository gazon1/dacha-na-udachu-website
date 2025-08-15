import sqlalchemy as sa
from main import Bed, House, app, db

app.app_context().push()
House.query.delete()
db.session.commit()

Bed.query.delete()
db.session.commit()

for name, comfort, capacity, price in [
    (
        "Домик основной",
        "Кухня; Wi-Fi; Терраса; Парковка; Барбекю; Сауна",
        "до 4 человек. 3 кровати, 1 раскладушка",
        "3000",
    ),
    ("Винтажный домик деда", "Wi-Fi; Парковка; Барбекю; Сауна", "до 4 человек. 4 кровати", "3000"),
    # ("Секретный домик сестры", "Парковка; Сауна", "до 4 человек. 3 кровати, 1 раскладушка", "3000"),
]:
    h = House(name=name, comfort=comfort, capacity=capacity, price=price)
    db.session.add(h)
    db.session.commit()

query = sa.select(House)
h_list = db.session.scalars(query).all()
print(h_list)

# import pdb; pdb.set_trace()
house_name_list = ["Домик основной", "Винтажный домик деда"]
bed_list_per_house = {
    "Домик основной": [
        "Верхняя двухярусная кровать",
        "Нижняя двухярусная кровать",
        "Одноярусная кровать",
    ],
    "Винтажный домик деда": [
        "Верхняя двухярусная кровать",
        "Нижняя двухярусная кровать",
        "Одноярусная кровать справа от входа",
        "Одноярусная кровать слева от входа",
    ],
}

for house_name in house_name_list:
    h = House.query.filter(
        House.name == house_name
    ).limit(1).all()
    for bed_name in bed_list_per_house[house_name]:
        bed = Bed(name=bed_name, house_id=h[0].id)
        db.session.add(bed)
        db.session.commit()

query = sa.select(Bed)
b_list = db.session.scalars(query).all()
print(b_list)
