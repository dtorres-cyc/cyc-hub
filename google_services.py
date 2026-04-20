import os
import base64
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.mime.text import MIMEText
from email import encoders

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaInMemoryUpload

from config import (GOOGLE_CREDENTIALS_FILE, GOOGLE_TOKEN_FILE,
                    GOOGLE_SCOPES, DRIVE_FOLDER_ID, COMPANY)


def _get_credentials():
    creds = None
    if os.path.exists(GOOGLE_TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(GOOGLE_TOKEN_FILE, GOOGLE_SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                GOOGLE_CREDENTIALS_FILE, GOOGLE_SCOPES
            )
            creds = flow.run_local_server(port=0)
        with open(GOOGLE_TOKEN_FILE, "w") as f:
            f.write(creds.to_json())
    return creds


def upload_to_drive(pdf_bytes: bytes, filename: str) -> tuple[str, str]:
    """
    Sube el PDF a Drive.
    Retorna (file_id, web_view_link).
    """
    creds   = _get_credentials()
    service = build("drive", "v3", credentials=creds)

    file_metadata = {
        "name":    filename,
        "parents": [DRIVE_FOLDER_ID],
        "mimeType": "application/pdf",
    }
    media = MediaInMemoryUpload(pdf_bytes, mimetype="application/pdf", resumable=False)
    file  = service.files().create(
        body=file_metadata,
        media_body=media,
        fields="id,webViewLink",
    ).execute()

    return file["id"], file.get("webViewLink", "")


def send_email(to_email: str, cliente_nombre: str, numero: int,
               pdf_bytes: bytes, pdf_filename: str, notas: str = "") -> bool:
    """
    Envía el correo con la cotización adjunta desde la cuenta CYC.
    """
    creds   = _get_credentials()
    service = build("gmail", "v1", credentials=creds)

    msg = MIMEMultipart("mixed")
    msg["To"]      = to_email
    msg["From"]    = COMPANY["email"]
    msg["Subject"] = f"Cotización N°{numero:04d} – {COMPANY['name']}"

    body_html = f"""
    <html><body style="font-family: Arial, sans-serif; color: #333; font-size: 14px;">
      <p>Estimado/a <strong>{cliente_nombre}</strong>,</p>

      <p>Junto con saludar, adjuntamos la <strong>Cotización N°{numero:04d}</strong>
         por los servicios de arriendo de maquinaria solicitados.</p>

      <p>Quedamos atentos a cualquier consulta o aclaración que necesite.</p>

      {"<p><em>Notas adicionales:</em> " + notas + "</p>" if notas else ""}

      <br>
      <p>Atentamente,</p>

      <table>
        <tr><td>
          <strong style="color: #E8651A; font-size:15px;">{COMPANY['name']}</strong><br>
          <span style="font-size:12px; color:#555;">{COMPANY['giro']}</span><br>
          <span style="font-size:12px;">📧 {COMPANY['email']}</span><br>
          <span style="font-size:12px;">🌐 {COMPANY['web']}</span><br>
          <span style="font-size:12px;">📍 {COMPANY['address']}</span>
        </td></tr>
      </table>

      <br>
      <p style="font-size:11px; color:#888;">
        Este correo y sus adjuntos son de carácter confidencial y están
        dirigidos exclusivamente al destinatario indicado.
      </p>
    </body></html>
    """

    msg.attach(MIMEText(body_html, "html", "utf-8"))

    # Adjunto PDF
    part = MIMEBase("application", "pdf")
    part.set_payload(pdf_bytes)
    encoders.encode_base64(part)
    part.add_header("Content-Disposition", f'attachment; filename="{pdf_filename}"')
    msg.attach(part)

    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    service.users().messages().send(
        userId="me",
        body={"raw": raw}
    ).execute()

    return True
