import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.post import Post
from app.models.project import Project
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.feed import PostCreate, PostOut
from app.utils.notify import notify_company

router = APIRouter(prefix='/feed', tags=['feed'])


def _to_out(post: Post) -> PostOut:
    return PostOut(
        id=post.id,
        project_id=post.project_id,
        project_name=post.project.name,
        author_id=post.author_id,
        author_name=post.author.name,
        author_avatar_url=post.author.avatar_url,
        content=post.content,
        image_url=post.image_url,
        created_at=post.created_at,
    )


@router.get('', response_model=list[PostOut])
def list_posts(
    project_id: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Post).filter(Post.company_id == user.company_id)
    if project_id:
        q = q.filter(Post.project_id == project_id)
    posts = q.order_by(Post.created_at.desc()).offset(skip).limit(limit).all()
    return [_to_out(p) for p in posts]


@router.post('', response_model=PostOut, status_code=status.HTTP_201_CREATED)
def create_post(
    body: PostCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(
        Project.id == body.project_id,
        Project.company_id == user.company_id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')

    post = Post(
        company_id=user.company_id,
        project_id=body.project_id,
        author_id=user.id,
        content=body.content,
        image_url=body.image_url,
    )
    db.add(post)
    notify_company(
        db,
        company_id=user.company_id,
        type='post',
        title='New site update',
        message=f'{user.name} posted an update on {project.name}',
        link=f'/projects/{project.id}',
        exclude_user_id=user.id,
    )
    db.commit()
    db.refresh(post)
    return _to_out(post)


@router.post('/upload')
async def upload_image(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    if not settings.cloudinary_cloud_name:
        raise HTTPException(status_code=503, detail='Image uploads are not configured on this server')

    if file.content_type not in ('image/jpeg', 'image/png', 'image/webp', 'image/gif'):
        raise HTTPException(status_code=400, detail='Unsupported image type')

    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
    )

    contents = await file.read()
    result = cloudinary.uploader.upload(
        contents,
        folder='buildtrack/feed',
        resource_type='image',
        transformation=[{'width': 1200, 'crop': 'limit', 'quality': 'auto'}],
    )
    return {'url': result['secure_url']}
