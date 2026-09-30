export default async function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: "hardwin-business-os",
    timestamp: new Date().toISOString()
  });
}
