from django.core.paginator import Paginator
from django.template.response import TemplateResponse

from wagtail.models import Page

# To enable logging of search queries for use with the "Promoted search results" module
# <https://docs.wagtail.org/en/stable/reference/contrib/searchpromotions.html>
# uncomment the following line and the lines indicated in the search function
# (after adding wagtail.contrib.search_promotions to INSTALLED_APPS):

# from wagtail.contrib.search_promotions.models import Query


def search(request):
    search_query = request.GET.get("query", None)
    page = request.GET.get("page", 1)

    # Search
    if search_query:
        search_results = Page.objects.live().search(search_query)

        # To log this query for use with the "Promoted search results" module:

        # query = Query.get(search_query)
        # query.add_hit()

    else:
        search_results = Page.objects.none()

    # Pagination — get_page() handles EmptyPage and PageNotAnInteger automatically
    paginator = Paginator(search_results, 10)
    search_results = paginator.get_page(page)

    return TemplateResponse(
        request,
        "search/search.html",
        {
            "search_query": search_query,
            "search_results": search_results,
        },
    )
