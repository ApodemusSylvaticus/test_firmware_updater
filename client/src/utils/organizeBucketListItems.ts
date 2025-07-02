export const organizeBucketListItems = (items: string[]): Map<string, string[]> => {
  const map = new Map<string, string[]>();

  items.forEach((item) => {
    const [device, version] = item.split('::');
    console.log(device, version);
    if (!map.has(device)) {
      map.set(device, []);
    }
    map.get(device)!.push(version);
  });

  return map;
};
