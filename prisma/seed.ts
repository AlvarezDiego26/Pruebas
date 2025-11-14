import { PrismaClient, Role, RoomType, RoomStatus, RefundStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const districts = [
  "Cayma", "Cerro Colorado", "Jacobo Hunter", "Yanahuara", "Sachaca",
  "Mariano Melgar", "Paucarpata", "Selva Alegre", "José Luis Bustamante y Rivero",
  "Sabandía", "Tiabaya", "Umacollo", "Socabaya", "Characato", "Mollebaya",
  "Pocsi", "Hunter", "Alto Selva Alegre", "Chiguata", "Miraflores",
  "Yura", "Chachas", "Polobaya", "Vitor", "Cocabamba", "Pampacolca", "Tarucani",
  "La Joya", "Uchumayo"
]

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number, decimals = 6) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals))
}

async function main() {
  // 🛑 Si ya existen hoteles, no volver a ejecutar el seed
  const existingHotels = await prisma.hotel.count()
  if (existingHotels > 0) {
    console.log('⚠️ Seed omitido: ya existen datos en la base de datos.')
    return
  }

  console.log('🌱 Iniciando seed...')

  // Crear SUPERADMIN
  const superAdminPassword = await bcrypt.hash('SuperAdminPass123!', 10)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@example.com' },
    update: {},
    create: {
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@example.com',
      password: superAdminPassword,
      role: Role.SUPERADMIN,
    },
  })

  // Crear ADMIN
  const adminPassword = await bcrypt.hash('AdminPass123!', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      password: adminPassword,
      role: Role.ADMIN,
    },
  })

  // Crear CLIENTE
  const clientPassword = await bcrypt.hash('ClientPass123!', 10)
  const client = await prisma.user.upsert({
    where: { email: 'client@example.com' },
    update: {},
    create: {
      firstName: 'Cliente',
      lastName: 'Demo',
      email: 'client@example.com',
      password: clientPassword,
      role: Role.CLIENT,
    },
  })

  // Crear hoteles y habitaciones
  for (const district of districts) {
    for (let h = 1; h <= 2; h++) {
      const hotel = await prisma.hotel.create({
        data: {
          name: `Hotel ${district} #${h}`,
          address: `Calle ${randomInt(1, 100)} #${randomInt(1, 50)}`,
          city: 'Arequipa',
          country: 'Peru',
          district,
          stars: randomInt(2, 5),
          description: `Hotel ubicado en ${district}`,
          latitude: randomFloat(-16.4500, -16.3500),
          longitude: randomFloat(-71.6500, -71.5000),
        },
      })

      const numRooms = randomInt(15, 20)
      const roomData = []

      for (let r = 1; r <= numRooms; r++) {
        const rand = Math.random()
        let type: RoomType
        if (rand < 0.3) type = RoomType.SINGLE
        else if (rand < 0.65) type = RoomType.DOUBLE
        else if (rand < 0.85) type = RoomType.SUITE
        else type = RoomType.FAMILY

        const price =
          type === RoomType.SINGLE ? 40 :
          type === RoomType.DOUBLE ? 60 :
          type === RoomType.SUITE ? 120 : 90

        roomData.push({
          hotelId: hotel.id,
          number: `R${r.toString().padStart(3, '0')}`,
          type,
          price,
          capacity: type === RoomType.SINGLE ? 1 : type === RoomType.DOUBLE ? 2 : 4,
          status: RoomStatus.AVAILABLE,
        })
      }

      await prisma.room.createMany({
        data: roomData,
        skipDuplicates: true,
      })
    }
  }

  // Crear una reserva y solicitud de reembolso de ejemplo
  const exampleRoom = await prisma.room.findFirst()
  if (exampleRoom) {
    const reservation = await prisma.reservation.create({
      data: {
        userId: client.id,
        roomId: exampleRoom.id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: "CONFIRMED",
        totalAmount: exampleRoom.price,
      },
    })

    await prisma.refundRequest.create({
      data: {
        reservationId: reservation.id,
        userId: client.id,
        status: RefundStatus.PENDING,
        reason: "El cliente desea cancelar su reserva de prueba",
        reviewedById: superAdmin.id,
      },
    })

    console.log('💰 Ejemplo de RefundRequest creado.')        
  }

  console.log('✅ Seed completado con éxito.')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
