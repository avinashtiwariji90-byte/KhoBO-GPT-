import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, desc
from app.db.session import get_db, AsyncSessionLocal
from app.db.models import User, Conversation, Message, UploadedFile, Usage, Lead, Business
from app.schemas.chat import (
    ConversationResponse,
    ConversationDetail,
    ConversationCreate,
    ConversationRename,
    MessageResponse,
    MessageCreate,
    MessageEdit
)
from app.api.deps import get_current_user
from app.services.llm_service import llm_service
from app.services.doc_service import doc_service
from app.services.lead_extractor import lead_extractor
from app.core.config import settings

router = APIRouter()

@router.get("/conversations", response_model=List[ConversationResponse])
async def get_conversations(
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Conversation).where(Conversation.user_id == current_user.id)
    if search:
        query = query.where(Conversation.title.ilike(f"%{search}%"))
    
    # Sort pinned first, then by updated_at
    query = query.order_by(desc(Conversation.is_pinned), desc(Conversation.updated_at))
    result = await db.execute(query)
    convos = result.scalars().all()

    response = []
    for c in convos:
        # get last message preview
        msg_res = await db.execute(
            select(Message).where(Message.conversation_id == c.id).order_by(desc(Message.created_at)).limit(1)
        )
        last_msg = msg_res.scalars().first()
        preview = last_msg.content[:80] + "..." if last_msg and len(last_msg.content) > 80 else (last_msg.content if last_msg else None)

        response.append(ConversationResponse(
            id=c.id,
            title=c.title,
            is_pinned=c.is_pinned,
            created_at=c.created_at,
            updated_at=c.updated_at,
            last_message=preview
        ))

    return response

@router.post("/conversations", response_model=ConversationDetail)
async def create_conversation(
    conv_in: Optional[ConversationCreate] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    title = conv_in.title if conv_in and conv_in.title else "New Chat"
    convo = Conversation(
        user_id=current_user.id,
        title=title,
        is_pinned=False
    )
    db.add(convo)
    await db.commit()
    await db.refresh(convo)

    return ConversationDetail(
        id=convo.id,
        title=convo.title,
        is_pinned=convo.is_pinned,
        created_at=convo.created_at,
        updated_at=convo.updated_at,
        messages=[]
    )

@router.get("/conversations/{convo_id}", response_model=ConversationDetail)
async def get_conversation(
    convo_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == convo_id,
            Conversation.user_id == current_user.id
        )
    )
    convo = result.scalars().first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    msg_res = await db.execute(
        select(Message).where(Message.conversation_id == convo.id).order_by(Message.created_at)
    )
    messages = msg_res.scalars().all()

    return ConversationDetail(
        id=convo.id,
        title=convo.title,
        is_pinned=convo.is_pinned,
        created_at=convo.created_at,
        updated_at=convo.updated_at,
        messages=[
            MessageResponse(
                id=m.id,
                conversation_id=m.conversation_id,
                role=m.role,
                content=m.content,
                tokens=m.tokens,
                meta_info=m.meta_info,
                created_at=m.created_at
            ) for m in messages
        ]
    )

@router.patch("/conversations/{convo_id}/rename", response_model=ConversationResponse)
async def rename_conversation(
    convo_id: str,
    rename_data: ConversationRename,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == convo_id,
            Conversation.user_id == current_user.id
        )
    )
    convo = result.scalars().first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    convo.title = rename_data.title.strip() or "Untitled Chat"
    convo.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(convo)

    return ConversationResponse(
        id=convo.id,
        title=convo.title,
        is_pinned=convo.is_pinned,
        created_at=convo.created_at,
        updated_at=convo.updated_at
    )

@router.patch("/conversations/{convo_id}/pin", response_model=ConversationResponse)
async def toggle_pin_conversation(
    convo_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == convo_id,
            Conversation.user_id == current_user.id
        )
    )
    convo = result.scalars().first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    convo.is_pinned = not convo.is_pinned
    convo.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(convo)

    return ConversationResponse(
        id=convo.id,
        title=convo.title,
        is_pinned=convo.is_pinned,
        created_at=convo.created_at,
        updated_at=convo.updated_at
    )

@router.delete("/conversations/{convo_id}")
async def delete_conversation(
    convo_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == convo_id,
            Conversation.user_id == current_user.id
        )
    )
    convo = result.scalars().first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    await db.delete(convo)
    await db.commit()
    return {"status": "success", "message": "Conversation deleted"}

@router.post("/stream")
async def stream_chat(
    msg_in: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Check Usage Limits
    usage_res = await db.execute(select(Usage).where(Usage.user_id == current_user.id))
    usage = usage_res.scalars().first()
    if not usage:
        usage = Usage(user_id=current_user.id, messages_count=0, files_count=0)
        db.add(usage)
        await db.flush()

    limit = settings.FREE_MESSAGE_LIMIT
    if current_user.plan == "business":
        limit = settings.BUSINESS_MESSAGE_LIMIT
    elif current_user.plan == "pro" or current_user.role == "admin":
        limit = settings.PRO_MESSAGE_LIMIT

    if usage.messages_count >= limit:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Message limit reached for {current_user.plan.upper()} plan ({limit} messages). Please upgrade your subscription to continue."
        )

    # 2. Get or create conversation
    convo = None
    if msg_in.conversation_id:
        c_res = await db.execute(
            select(Conversation).where(
                Conversation.id == msg_in.conversation_id,
                Conversation.user_id == current_user.id
            )
        )
        convo = c_res.scalars().first()

    if not convo:
        title = msg_in.content[:35] + "..." if len(msg_in.content) > 35 else msg_in.content
        convo = Conversation(
            user_id=current_user.id,
            title=title or "New Chat",
            is_pinned=False
        )
        db.add(convo)
        await db.flush()

    # 3. Store User Message
    user_msg = Message(
        conversation_id=convo.id,
        role="user",
        content=msg_in.content,
        tokens=len(msg_in.content.split())
    )
    db.add(user_msg)
    usage.messages_count += 1
    convo.updated_at = datetime.now(timezone.utc)
    await db.commit()

    # 4. Fetch Conversation History
    history_res = await db.execute(
        select(Message).where(Message.conversation_id == convo.id).order_by(Message.created_at)
    )
    all_msgs = history_res.scalars().all()
    formatted_history = [{"role": m.role, "content": m.content} for m in all_msgs]

    # 5. Check Document Context (if user has files in this conversation or attached)
    doc_context = ""
    file_query = select(UploadedFile).where(UploadedFile.user_id == current_user.id)
    if msg_in.file_ids:
        file_query = file_query.where(UploadedFile.id.in_(msg_in.file_ids))
    else:
        file_query = file_query.where(
            or_(
                UploadedFile.conversation_id == convo.id,
                UploadedFile.conversation_id.is_(None)
            )
        ).limit(3)
    
    files_res = await db.execute(file_query)
    user_files = files_res.scalars().all()
    if user_files:
        collected_chunks = []
        for uf in user_files:
            if uf.extracted_text:
                chunks = doc_service.chunk_text(uf.extracted_text)
                relevant = doc_service.search_relevant_chunks(msg_in.content, chunks, top_k=2)
                if relevant:
                    collected_chunks.append(f"[File: {uf.original_filename}]\n" + "\n---\n".join(relevant))
        if collected_chunks:
            doc_context = "\n\n".join(collected_chunks)

    # 6. Automatic Lead Detection & Storage
    lead_data = lead_extractor.extract_lead_from_conversation(msg_in.content)
    if lead_data:
        # Check if user has an associated business or find primary business
        biz_res = await db.execute(select(Business).limit(1))
        target_biz = biz_res.scalars().first()
        target_biz_id = target_biz.id if target_biz else None

        new_lead = Lead(
            business_id=target_biz_id,
            user_id=current_user.id,
            name=lead_data["name"],
            contact=lead_data["contact"],
            requirement=lead_data["requirement"],
            budget=lead_data["budget"],
            location=lead_data["location"],
            source=lead_data["source"],
            status="New"
        )
        db.add(new_lead)
        await db.commit()

    # 7. Server-Sent Events (SSE) Streaming Response
    async def event_generator():
        collected_response = []
        # Yield initial metadata
        yield f"data: {json.dumps({'type': 'init', 'conversation_id': convo.id, 'title': convo.title})}\n\n"

        try:
            async for chunk in llm_service.generate_response_stream(
                messages=formatted_history,
                doc_context=doc_context,
                lead_mode=msg_in.lead_assistant_mode
            ):
                collected_response.append(chunk)
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
        except Exception as e:
            err_chunk = f"\n\n[Reasoning notice: {str(e)}]"
            collected_response.append(err_chunk)
            yield f"data: {json.dumps({'type': 'chunk', 'content': err_chunk})}\n\n"

        full_content = "".join(collected_response).strip()
        if not full_content:
            fallback = "Hello! I am ORA GPT. How can I assist you with your project today?"
            full_content = fallback
            yield f"data: {json.dumps({'type': 'chunk', 'content': fallback})}\n\n"

        # Save assistant message to database
        async with AsyncSessionLocal() as new_session:
            asst_msg = Message(
                conversation_id=convo.id,
                role="assistant",
                content=full_content,
                tokens=len(full_content.split()),
                meta_info=json.dumps({"has_doc_context": bool(doc_context), "lead_captured": bool(lead_data)})
            )
            new_session.add(asst_msg)
            await new_session.commit()

        yield f"data: {json.dumps({'type': 'done', 'conversation_id': convo.id, 'lead_detected': bool(lead_data)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.post("/messages/{message_id}/regenerate")
async def regenerate_message(
    message_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Find message
    res = await db.execute(select(Message).where(Message.id == message_id))
    msg = res.scalars().first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    convo_res = await db.execute(
        select(Conversation).where(
            Conversation.id == msg.conversation_id,
            Conversation.user_id == current_user.id
        )
    )
    convo = convo_res.scalars().first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # If message is assistant, delete it and regenerate from last user message
    if msg.role == "assistant":
        await db.delete(msg)
        await db.commit()

    # Get conversation history up to this point
    hist_res = await db.execute(
        select(Message).where(Message.conversation_id == convo.id).order_by(Message.created_at)
    )
    all_msgs = hist_res.scalars().all()
    formatted = [{"role": m.role, "content": m.content} for m in all_msgs]

    async def event_generator():
        collected = []
        yield f"data: {json.dumps({'type': 'init', 'conversation_id': convo.id})}\n\n"

        async for chunk in llm_service.generate_response_stream(messages=formatted):
            collected.append(chunk)
            yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

        full = "".join(collected)
        async with AsyncSessionLocal() as new_session:
            asst_msg = Message(
                conversation_id=convo.id,
                role="assistant",
                content=full,
                tokens=len(full.split())
            )
            new_session.add(asst_msg)
            await new_session.commit()

        yield f"data: {json.dumps({'type': 'done', 'conversation_id': convo.id})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
    )

@router.put("/messages/{message_id}")
async def edit_message(
    message_id: str,
    edit_data: MessageEdit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Message).where(Message.id == message_id))
    msg = res.scalars().first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    convo_res = await db.execute(
        select(Conversation).where(
            Conversation.id == msg.conversation_id,
            Conversation.user_id == current_user.id
        )
    )
    convo = convo_res.scalars().first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    msg.content = edit_data.content
    msg.tokens = len(edit_data.content.split())
    convo.updated_at = datetime.now(timezone.utc)
    await db.commit()

    return {"status": "success", "message": "Message updated successfully"}
