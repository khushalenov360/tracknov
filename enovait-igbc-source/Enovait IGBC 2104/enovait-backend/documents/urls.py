from django.urls import path
from . import views

urlpatterns = [
    path("",                         views.DocumentListView.as_view(),   name="document-list"),
    path("upload/",                  views.DocumentUploadView.as_view(), name="document-upload"),
    path("pending/",                 views.pending_documents,            name="document-pending"),
    path("<int:pk>/",                views.DocumentDetailView.as_view(), name="document-detail"),
    path("<int:pk>/validate/",       views.validate_document,            name="document-validate"),
]
