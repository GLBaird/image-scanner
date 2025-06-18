import prisma from './prisma/client';

async function main() {
    // await prisma.exifData.create({
    //     data: { md5: '4fa75222b439455a1d8257fb009a283b', exif: JSON.stringify({ tats: true }) },
    // });
    const jobId = 'cmc1vz5pq0000r978yvrlf0wr';
    const value = await prisma.image.count({ where: { jobIds: { has: jobId }, exifData: null } });
    console.log('counted', value);
}

main()
    .then(() => console.log('end'))
    .catch((e) => console.error(e));
