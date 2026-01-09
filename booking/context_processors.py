from .forms import BookingForm

def booking_form(request):
    return {'booking_form': BookingForm()}