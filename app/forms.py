from flask_wtf import FlaskForm
from wtforms import DateField, SubmitField
from wtforms.validators import DataRequired


class BookingForm(FlaskForm):
    check_in = DateField("Дата заезда", validators=[DataRequired()], render_kw={"placeholder": "Выберите дату"})
    check_out = DateField("Дата выезда", validators=[DataRequired()], render_kw={"placeholder": "Выберите дату"})
    submit = SubmitField("Забронировать")
