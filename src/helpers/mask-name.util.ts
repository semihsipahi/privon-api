export function maskName(fullName: string): string {
  if (!fullName || typeof fullName !== 'string') {
    return '';
  }

  const names = fullName.trim().split(/\s+/);

  return names
    .map((name) => {
      if (name.length <= 1) {
        return name;
      }
      const firstChar = name.charAt(0).toUpperCase();
      const maskedChars = '*'.repeat(name.length - 1);
      return `${firstChar}${maskedChars}`;
    })
    .join(' ');
}
