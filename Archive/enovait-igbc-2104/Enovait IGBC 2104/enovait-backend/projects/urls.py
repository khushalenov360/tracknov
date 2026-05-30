from django.urls import path
from . import views

urlpatterns = [
    path("",                                    views.ProjectListCreateView.as_view(), name="project-list"),
    path("<int:pk>/",                           views.ProjectDetailView.as_view(),     name="project-detail"),
    path("<int:project_id>/members/add/",       views.add_member,                      name="project-add-member"),
    path("<int:project_id>/members/<int:user_id>/", views.remove_member,               name="project-remove-member"),
]
