import phonenumbers
from flask_wtf import FlaskForm
from wtforms import DateField, SelectField, StringField, SubmitField, TelField
from wtforms.validators import DataRequired, ValidationError


class BookingForm(FlaskForm):
    check_in = DateField("Дата заезда", validators=[DataRequired()], render_kw={"placeholder": "Выберите дату"})
    check_out = DateField("Дата выезда", validators=[DataRequired()], render_kw={"placeholder": "Выберите дату"})
    name = StringField("Ваше имя", validators=[DataRequired()])
    phone = TelField("Телефон", validators=[DataRequired()])
    telegram = StringField("Telegram", validators=[DataRequired()])
    guest_num = SelectField(
        "Гостей (до 8)",
        choices=[(f"{el}", f"{el}") for el in range(1, 9)],
        validators=[DataRequired()],
    )
    submit = SubmitField("Забронировать")

    def validate_phone(self, phone):
        try:
            p = phonenumbers.parse(phone.data)
            if not phonenumbers.is_valid_number(p):
                raise ValueError()
        except (phonenumbers.phonenumberutil.NumberParseException, ValueError):
            raise ValidationError("Invalid phone number") from ValueError

    def validate_check_out(self, field):
        if field.data <= self.check_in.data:
            raise ValidationError("Checkout date must be after or checkin date.")

    def validate_check_in(self, field):
        if self.check_out.data <= field.data:
            raise ValidationError("Checkin date must be before checkout date.")
