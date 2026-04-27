from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import CanCreateProject, IsEnov360Admin
from accounts.models import User
from .models import Project, ProjectMembership
from .serializers import ProjectSerializer, MembershipSerializer, AddMemberSerializer


def user_can_access_project(user, project):
    """True if user is admin OR a project member."""
    if user.is_enov360_admin:
        return True
    return project.memberships.filter(user=user).exists()


class ProjectListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/projects/        — list projects accessible to current user
    POST /api/projects/        — create project (admin / architect only)
    """
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Project.objects.select_related("created_by").prefetch_related(
            "memberships__user", "documents"
        )
        user = self.request.user
        if not user.is_enov360_admin:
            qs = qs.filter(memberships__user=user)

        # Optional filters
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(name__icontains=search)

        return qs.distinct()

    def get_permissions(self):
        if self.request.method == "POST":
            return [CanCreateProject()]
        return [IsAuthenticated()]


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/projects/<id>/"""
    serializer_class   = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Project.objects.select_related("created_by").prefetch_related(
            "memberships__user"
        )

    def get_object(self):
        obj = super().get_object()
        if not user_can_access_project(self.request.user, obj):
            self.permission_denied(self.request)
        return obj

    def get_permissions(self):
        if self.request.method in ("PATCH", "PUT", "DELETE"):
            return [CanCreateProject()]
        return [IsAuthenticated()]


@api_view(["POST"])
@permission_classes([IsEnov360Admin])
def add_member(request, project_id):
    """POST /api/projects/<id>/members/add/"""
    project = Project.objects.get(pk=project_id)
    serializer = AddMemberSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    membership, created = ProjectMembership.objects.get_or_create(
        project=project,
        user_id=serializer.validated_data["user_id"],
        defaults={"added_by": request.user},
    )
    if not created:
        return Response({"detail": "User is already a member."}, status=status.HTTP_400_BAD_REQUEST)
    return Response(MembershipSerializer(membership).data, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
@permission_classes([IsEnov360Admin])
def remove_member(request, project_id, user_id):
    """DELETE /api/projects/<id>/members/<user_id>/"""
    deleted, _ = ProjectMembership.objects.filter(
        project_id=project_id, user_id=user_id
    ).delete()
    if not deleted:
        return Response({"detail": "Membership not found."}, status=status.HTTP_404_NOT_FOUND)
    return Response(status=status.HTTP_204_NO_CONTENT)
