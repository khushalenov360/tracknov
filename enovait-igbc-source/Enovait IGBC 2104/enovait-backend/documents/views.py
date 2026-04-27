from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from accounts.permissions import CanValidateDocument
from projects.models import Project
from .models import Document
from .serializers import DocumentSerializer, DocumentUploadSerializer, ValidationActionSerializer


def user_can_access_document(user, document):
    if user.is_enov360_admin:
        return True
    return document.project.memberships.filter(user=user).exists()


class DocumentListView(generics.ListAPIView):
    """
    GET /api/documents/
    Query params: project, validation_status, category, search
    """
    serializer_class   = DocumentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [filters.SearchFilter, filters.OrderingFilter]
    search_fields      = ["name", "notes", "project__name"]
    ordering_fields    = ["uploaded_at", "name", "validation_status"]
    ordering           = ["-uploaded_at"]

    def get_queryset(self):
        user = self.request.user
        qs = Document.objects.select_related(
            "project", "uploaded_by", "validated_by"
        )
        if not user.is_enov360_admin:
            qs = qs.filter(project__memberships__user=user)

        # Filters
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)

        val_status = self.request.query_params.get("validation_status")
        if val_status:
            qs = qs.filter(validation_status=val_status)

        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)

        return qs.distinct()


class DocumentUploadView(generics.CreateAPIView):
    """POST /api/documents/upload/  (multipart/form-data)"""
    serializer_class   = DocumentUploadSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document = serializer.save()
        return Response(
            DocumentSerializer(document, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class DocumentDetailView(generics.RetrieveDestroyAPIView):
    """
    GET    /api/documents/<id>/
    DELETE /api/documents/<id>/   (uploader or admin only)
    """
    serializer_class   = DocumentSerializer
    permission_classes = [IsAuthenticated]
    queryset = Document.objects.select_related("project", "uploaded_by", "validated_by")

    def get_object(self):
        obj = super().get_object()
        if not user_can_access_document(self.request.user, obj):
            self.permission_denied(self.request)
        return obj

    def destroy(self, request, *args, **kwargs):
        document = self.get_object()
        user = request.user
        if not (user.is_enov360_admin or document.uploaded_by == user):
            return Response(
                {"detail": "Only the uploader or an admin can delete this document."},
                status=status.HTTP_403_FORBIDDEN,
            )
        document.file.delete(save=False)   # remove from disk/storage
        document.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([CanValidateDocument])
def validate_document(request, pk):
    """
    POST /api/documents/<id>/validate/
    Body: { "action": "approve" | "reject", "rejection_reason": "..." }
    """
    try:
        document = Document.objects.get(pk=pk)
    except Document.DoesNotExist:
        return Response({"detail": "Document not found."}, status=status.HTTP_404_NOT_FOUND)

    if document.validation_status != Document.ValidationStatus.PENDING:
        return Response(
            {"detail": f"Document is already '{document.validation_status}'."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = ValidationActionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    document = serializer.save(document=document, validated_by=request.user)

    return Response(DocumentSerializer(document, context={"request": request}).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def pending_documents(request):
    """GET /api/documents/pending/  — quick list for the validation queue."""
    if not request.user.can_validate_document:
        return Response(
            {"detail": "Only admins can view the validation queue."},
            status=status.HTTP_403_FORBIDDEN,
        )
    docs = Document.objects.filter(
        validation_status=Document.ValidationStatus.PENDING
    ).select_related("project", "uploaded_by")
    return Response(DocumentSerializer(docs, many=True, context={"request": request}).data)
