export function downloadFile(url: string) {
    const link = document.createElement('a');
    link.href = url;
    link.download =  '';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}