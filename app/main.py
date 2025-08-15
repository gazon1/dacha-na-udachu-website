import sqlalchemy as sa
import sqlalchemy.orm as so
from config import Config
from flask import Flask, flash, jsonify, render_template, request, url_for
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from forms import BookingForm

app = Flask(__name__)
application = app

app.config.from_object(Config)
db = SQLAlchemy(app)
migrate = Migrate(app, db)


class House(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    comfort = db.Column(db.String(300), nullable=True)
    capacity = db.Column(db.String(300), nullable=False)
    price = db.Column(db.Integer)

    def __repr__(self):
        return f"<House {self.name}>"


class Bed(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    house_id: so.Mapped[int] = so.mapped_column(sa.ForeignKey(House.id), index=True)
    name = db.Column(db.String(100), nullable=False)

    def __repr__(self):
        return f"<Bed {self.name}>"


class Booking(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    house_id: so.Mapped[int] = so.mapped_column(sa.ForeignKey(House.id), index=True)
    # bed_id: so.Mapped[int] = so.mapped_column(sa.ForeignKey(Bed.id), index=True)
    name = db.Column(db.String(100), nullable=False)
    telegram = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(11), nullable=False)
    checkin_date = db.Column(db.Date, nullable=False)
    checkout_date = db.Column(db.Date, nullable=False)
    guests_num = db.Column(db.Integer, nullable=False)

    def __repr__(self):
        return f"<Booking {self.name}>"


# @app.route("/about.html")
# def about():
#     return render_template("about.html")


# @app.route("/booking.html")
# def booking():
#     return render_template("booking.html")


@app.route("/", methods=["GET", "POST"])
def main():
    booking_form = BookingForm()
    if booking_form.validate_on_submit():
        flash("Login successful!", "success")
        new_booking = Booking(
            name=booking_form.name.data,
            telegram=booking_form.telegram.data,
            phone=booking_form.phone.data,
            guests_num=booking_form.guest_num.data,
            checkin_date=booking_form.check_in.data,
            checkout_date=booking_form.check_out.data,
            house_id=booking_form.house_id.data,
            # bed_id=data["bed_id"],
        )
        db.session.add(new_booking)
        db.session.commit()
        return jsonify({"message": "Дача успешно забронирована!"}), 201
    else:
        flash("Invalid credentials", "error")
    return render_template("main.html", form=booking_form)


# @app.route("/post/<post_id>")
# def get_post(post_id: str):
#     return render_template(f"events/{post_id}.html")


# @app.route("/about_apartment/<apartment_id>")
# def about_apartment(apartment_id: str):
#     return render_template(f"booking/{apartment_id}.html")


# @app.route("/bookings", methods=["POST"])
# def create_booking():
#     data = request.get_json()
#     new_booking = Booking(
#         name=data["name"],
#         telegram=data["telegram"],
#         date=data["date"],
#         house_id=data["house_id"],
#         bed_id=data["bed_id"],
#     )
#     db.session.add(new_booking)
#     db.session.commit()
#     return jsonify({"message": "Booking created successfully"}), 201


# @app.route("/bookings", methods=["GET"])
# def get_bookings():
#     bookings = Booking.query.all()
#     booking_list = []
#     for booking in bookings:
#         booking_list.append(
#             {
#                 "id": booking.id,
#                 "name": booking.name,
#                 "telegram": booking.telegram,
#                 "date": booking.date.isoformat(),
#                 "house_id": booking.house_id,
#                 "bed_id": booking,
#             }
#         )
#     return jsonify(booking_list)


if __name__ == "__main__":
    application.run(host="0.0.0.0")
