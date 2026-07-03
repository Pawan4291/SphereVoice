import { getAstridWallet } from './_astrid';
export default async function handler(req: any, res: any) {
  const sphere = await getAstridWallet();
  res.json({ address: sphere.identity?.directAddress, nametag: sphere.identity?.nametag });
}