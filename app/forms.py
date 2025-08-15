from flask import Flask, flash, redirect, render_template, request, url_for
from flask_wtf import FlaskForm
from wtforms import DateField, StringField, SubmitField, TelField
from wtforms.validators import DataRequired

# class BookingForm(FlaskForm):
#     check_in = DateField("Дата заезда", validators=[DataRequired()], render_kw={"placeholder": "Выберите дату"})
#     check_out = DateField("Дата выезда", validators=[DataRequired()], render_kw={"placeholder": "Выберите дату"})
#     submit = SubmitField("Забронировать")


class BookingForm(FlaskForm):
    check_in = DateField("Дата заезда", validators=[DataRequired()], render_kw={"placeholder": "Выберите дату"})
    check_out = DateField("Дата выезда", validators=[DataRequired()], render_kw={"placeholder": "Выберите дату"})
    name = StringField("Ваше имя", validators=[DataRequired()])
    phone = TelField("Телефон", validators=[DataRequired()])
    telegram = StringField("Telegram", validators=[DataRequired()])
    submit = SubmitField("Забронировать")
