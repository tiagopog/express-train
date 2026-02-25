import { User } from '../src/models/generated/prisma/client'
import { buildClient } from '../src/config'

const prisma = buildClient([{ level: 'error', emit: 'event' }])

/*
 * Users
 */

const userSamples = [
  { name: 'Tiago Guedes', email: 'tiagopog@gmail.com', updatedAt: new Date() },
  { name: 'Ricardo Madeira', email: 'ricardo.madeira@gmail.com', updatedAt: new Date() },
  { name: 'Manoel da Silva', email: 'manoel.silva@gmail.com', updatedAt: new Date() },
]

async function seedUsers(samples: Partial<User>[]) {
  try {
    const upsertPromises = samples.map(async (sample) => {
      return prisma.user
        .upsert({
          where: { email: sample.email },
          create: sample as User,
          update: sample,
        })
        .then((user) => console.log(`User created: ${user.email}`))
        .catch((error) => console.log(`Error creating user ${sample.email}:`, error))
    })

    await Promise.all(upsertPromises)
  } catch (error) {
    console.error('An error occurred during seeding:', error)
  }
}

/*
 * Main
 */

;(async () => {
  await seedUsers(userSamples)
  console.log('Seeding users: done')
})()
