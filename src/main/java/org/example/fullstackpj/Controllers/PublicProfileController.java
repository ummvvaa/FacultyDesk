package org.example.fullstackpj.Controllers;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.example.fullstackpj.Dto.PublicProfileDto;
import org.example.fullstackpj.Service.UserService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

@RestController
@RequestMapping("/api/public")
public class PublicProfileController {

    private final UserService userService;

    public PublicProfileController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/profiles/{slug}")
    public PublicProfileDto getPublicProfile(@PathVariable String slug) {
        return userService.getPublicProfile(slug);
    }

    @GetMapping(value = "/profiles/{slug}/qr", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> getQrCode(@PathVariable String slug) throws WriterException, IOException {
        // Verify profile exists and is public
        userService.getPublicProfile(slug);

        String url = "http://localhost:3000/p/" + slug;
        QRCodeWriter writer = new QRCodeWriter();
        BitMatrix matrix = writer.encode(url, BarcodeFormat.QR_CODE, 400, 400);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(matrix, "PNG", baos);

        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .body(baos.toByteArray());
    }
}
