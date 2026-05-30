from rest_framework import serializers
from accounts.serializers import UserSerializer
from .models import Project, ProjectMembership


class MembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model  = ProjectMembership
        fields = ["id", "user", "added_at"]


class ProjectSerializer(serializers.ModelSerializer):
    created_by     = UserSerializer(read_only=True)
    members        = MembershipSerializer(source="memberships", many=True, read_only=True)
    document_count = serializers.ReadOnlyField()
    member_ids     = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )
    project_type_display = serializers.CharField(source="get_project_type_display", read_only=True)
    status_display       = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model  = Project
        fields = [
            "id", "name", "client", "location", "project_type", "project_type_display",
            "status", "status_display", "description", "progress",
            "created_by", "members", "member_ids", "document_count",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]

    def create(self, validated_data):
        member_ids = validated_data.pop("member_ids", [])
        request    = self.context["request"]
        project    = Project.objects.create(created_by=request.user, **validated_data)
        # Always add the creator
        self._sync_members(project, list(set([request.user.id] + member_ids)), request.user)
        return project

    def update(self, instance, validated_data):
        member_ids = validated_data.pop("member_ids", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if member_ids is not None:
            self._sync_members(instance, member_ids, self.context["request"].user)
        return instance

    def _sync_members(self, project, user_ids, added_by):
        existing = set(project.memberships.values_list("user_id", flat=True))
        to_add   = set(user_ids) - existing
        to_remove= existing - set(user_ids)
        for uid in to_add:
            ProjectMembership.objects.get_or_create(
                project=project, user_id=uid,
                defaults={"added_by": added_by},
            )
        project.memberships.filter(user_id__in=to_remove).delete()


class AddMemberSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()

    def validate_user_id(self, value):
        from accounts.models import User
        if not User.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError("Active user not found.")
        return value
