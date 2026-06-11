import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.document import Document
from app.models.project import Project
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.document import DocumentCreate, DocumentOut

router = APIRouter(prefix='/documents', tags=['documents'])

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB

ALLOWED_TYPES = {
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'image/jpeg', 'image/png', 'image/webp',
    'text/plain', 'text/csv',
}


def _to_out(doc: Document) -> DocumentOut:
    return DocumentOut(
        id=doc.id,
        company_id=doc.company_id,
        project_id=doc.project_id,
        name=doc.name,
        file_url=doc.file_url,
        file_type=doc.file_type,
        file_size=doc.file_size,
        category=doc.category,
        uploaded_by_id=doc.uploaded_by_id,
        uploaded_by_name=doc.uploaded_by.name if doc.uploaded_by else '',
        created_at=doc.created_at,
    )


def _get_project(project_id: str, company_id, db: Session) -> Project:
    p = db.query(Project).filter(Project.id == project_id, Project.company_id == company_id).first()
    if not p:
        raise HTTPException(status_code=404, detail='Project not found')
    return p


@router.post('/upload')
async def upload_file(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    if not settings.cloudinary_cloud_name:
        raise HTTPException(status_code=503, detail='File uploads are not configured on this server')

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f'Unsupported file type: {file.content_type}')

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail='File exceeds 20 MB limit')

    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
    )

    result = cloudinary.uploader.upload(
        contents,
        folder='buildtrack/documents',
        resource_type='auto',
        public_id=f'{user.company_id}/{file.filename}',
        use_filename=True,
        unique_filename=True,
    )

    return {
        'url': result['secure_url'],
        'file_type': file.content_type,
        'file_size': len(contents),
        'name': file.filename,
    }


@router.get('/projects/{project_id}', response_model=list[DocumentOut])
def list_documents(
    project_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _get_project(project_id, user.company_id, db)
    docs = (
        db.query(Document)
        .filter(Document.project_id == project_id, Document.company_id == user.company_id)
        .order_by(Document.created_at.desc())
        .all()
    )
    return [_to_out(d) for d in docs]


@router.post('/projects/{project_id}', response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
def create_document(
    project_id: str,
    body: DocumentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _get_project(project_id, user.company_id, db)
    doc = Document(
        **body.model_dump(),
        project_id=project_id,
        company_id=user.company_id,
        uploaded_by_id=user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return _to_out(doc)


@router.delete('/{doc_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    doc_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.company_id == user.company_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail='Document not found')
    db.delete(doc)
    db.commit()
