from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.equipment import Equipment
from app.models.material import Material
from app.models.vehicle import Vehicle
from app.models.project import Project
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.resources import (
    EquipmentCreate, EquipmentOut, EquipmentUpdate,
    MaterialCreate, MaterialOut, MaterialUpdate,
    VehicleCreate, VehicleOut, VehicleUpdate,
)

router = APIRouter(prefix='/resources', tags=['resources'])


def _check_project(project_id, company_id, db: Session) -> None:
    if project_id is None:
        return
    if not db.query(Project).filter(Project.id == project_id, Project.company_id == company_id).first():
        raise HTTPException(status_code=404, detail='Project not found')


# ── Equipment ──────────────────────────────────────────────────────────────

def _eq_out(e: Equipment) -> EquipmentOut:
    return EquipmentOut(
        id=e.id,
        company_id=e.company_id,
        name=e.name,
        category=e.category,
        status=e.status,
        project_id=e.project_id,
        project_name=e.project.name if e.project else None,
        notes=e.notes,
        created_at=e.created_at,
    )


@router.get('/equipment', response_model=list[EquipmentOut])
def list_equipment(
    project_id: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Equipment).filter(Equipment.company_id == user.company_id)
    if project_id:
        q = q.filter(Equipment.project_id == project_id)
    return [_eq_out(e) for e in q.order_by(Equipment.created_at.desc()).all()]


@router.post('/equipment', response_model=EquipmentOut, status_code=status.HTTP_201_CREATED)
def create_equipment(
    body: EquipmentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _check_project(body.project_id, user.company_id, db)
    e = Equipment(**body.model_dump(), company_id=user.company_id)
    db.add(e)
    db.commit()
    db.refresh(e)
    return _eq_out(e)


@router.put('/equipment/{eq_id}', response_model=EquipmentOut)
def update_equipment(
    eq_id: str,
    body: EquipmentUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    e = db.query(Equipment).filter(Equipment.id == eq_id, Equipment.company_id == user.company_id).first()
    if not e:
        raise HTTPException(status_code=404, detail='Equipment not found')
    _check_project(body.project_id, user.company_id, db)
    for k, v in body.model_dump().items():
        setattr(e, k, v)
    db.commit()
    db.refresh(e)
    return _eq_out(e)


@router.delete('/equipment/{eq_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_equipment(
    eq_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    e = db.query(Equipment).filter(Equipment.id == eq_id, Equipment.company_id == user.company_id).first()
    if not e:
        raise HTTPException(status_code=404, detail='Equipment not found')
    db.delete(e)
    db.commit()


# ── Materials ──────────────────────────────────────────────────────────────

def _mat_out(m: Material) -> MaterialOut:
    return MaterialOut(
        id=m.id,
        company_id=m.company_id,
        project_id=m.project_id,
        project_name=m.project.name if m.project else None,
        name=m.name,
        unit=m.unit,
        quantity=m.quantity,
        created_at=m.created_at,
    )


@router.get('/materials', response_model=list[MaterialOut])
def list_materials(
    project_id: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Material).filter(Material.company_id == user.company_id)
    if project_id:
        q = q.filter(Material.project_id == project_id)
    return [_mat_out(m) for m in q.order_by(Material.created_at.desc()).all()]


@router.post('/materials', response_model=MaterialOut, status_code=status.HTTP_201_CREATED)
def create_material(
    body: MaterialCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _check_project(body.project_id, user.company_id, db)
    m = Material(**body.model_dump(), company_id=user.company_id)
    db.add(m)
    db.commit()
    db.refresh(m)
    return _mat_out(m)


@router.put('/materials/{mat_id}', response_model=MaterialOut)
def update_material(
    mat_id: str,
    body: MaterialUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    m = db.query(Material).filter(Material.id == mat_id, Material.company_id == user.company_id).first()
    if not m:
        raise HTTPException(status_code=404, detail='Material not found')
    _check_project(body.project_id, user.company_id, db)
    for k, v in body.model_dump().items():
        setattr(m, k, v)
    db.commit()
    db.refresh(m)
    return _mat_out(m)


@router.delete('/materials/{mat_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_material(
    mat_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    m = db.query(Material).filter(Material.id == mat_id, Material.company_id == user.company_id).first()
    if not m:
        raise HTTPException(status_code=404, detail='Material not found')
    db.delete(m)
    db.commit()


# ── Vehicles ───────────────────────────────────────────────────────────────

def _veh_out(v: Vehicle) -> VehicleOut:
    return VehicleOut(
        id=v.id,
        company_id=v.company_id,
        name=v.name,
        plate_number=v.plate_number,
        driver_name=v.driver_name,
        project_id=v.project_id,
        project_name=v.project.name if v.project else None,
        created_at=v.created_at,
    )


@router.get('/vehicles', response_model=list[VehicleOut])
def list_vehicles(
    project_id: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Vehicle).filter(Vehicle.company_id == user.company_id)
    if project_id:
        q = q.filter(Vehicle.project_id == project_id)
    return [_veh_out(v) for v in q.order_by(Vehicle.created_at.desc()).all()]


@router.post('/vehicles', response_model=VehicleOut, status_code=status.HTTP_201_CREATED)
def create_vehicle(
    body: VehicleCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _check_project(body.project_id, user.company_id, db)
    v = Vehicle(**body.model_dump(), company_id=user.company_id)
    db.add(v)
    db.commit()
    db.refresh(v)
    return _veh_out(v)


@router.put('/vehicles/{veh_id}', response_model=VehicleOut)
def update_vehicle(
    veh_id: str,
    body: VehicleUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    v = db.query(Vehicle).filter(Vehicle.id == veh_id, Vehicle.company_id == user.company_id).first()
    if not v:
        raise HTTPException(status_code=404, detail='Vehicle not found')
    _check_project(body.project_id, user.company_id, db)
    for k, val in body.model_dump().items():
        setattr(v, k, val)
    db.commit()
    db.refresh(v)
    return _veh_out(v)


@router.delete('/vehicles/{veh_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle(
    veh_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    v = db.query(Vehicle).filter(Vehicle.id == veh_id, Vehicle.company_id == user.company_id).first()
    if not v:
        raise HTTPException(status_code=404, detail='Vehicle not found')
    db.delete(v)
    db.commit()
